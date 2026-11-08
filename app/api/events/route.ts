import { NextRequest, NextResponse } from 'next/server'
import { getValidAccessToken, readDropboxJson, writeDropboxJson } from '@/lib/dropbox'

const EVENTS_FILE_PATH = '/events/events.json'

interface Event {
  event_title: string
  location: string
  date: string
  times: string
  artists: string
  event_external_url?: string
  event_instagram_post?: string
}

interface EventsData {
  events: Event[]
  /** Days a past event stays in the website's main events section */
  recentDays?: number
}

/**
 * Validate date format: DD/MM/YYYY
 */
function validateDateFormat(date: string): { valid: boolean; error?: string } {
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
  if (!dateRegex.test(date.trim())) {
    return { valid: false, error: 'Date must be in format DD/MM/YYYY (15/11/2025)' }
  }

  const [, day, month, year] = date.trim().match(dateRegex) || []
  const dayNum = parseInt(day, 10)
  const monthNum = parseInt(month, 10)
  const yearNum = parseInt(year, 10)

  if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > 2100) {
    return { valid: false, error: 'Please enter a valid date' }
  }

  return { valid: true }
}

/**
 * Validate URL format
 */
function validateURL(url: string): { valid: boolean; error?: string } {
  try {
    const urlObj = new URL(url.trim())
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'URL must start with http:// or https://' }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: 'Please enter a valid URL' }
  }
}

/**
 * Validate the fields shared by POST and PUT; returns an error message or null
 */
function validateEventFields(body: Record<string, any>): string | null {
  const { event_title, location, date, times, artists, event_external_url, event_instagram_post } = body

  // Validate required fields
  if (!event_title || !location || !date || !times || !artists) {
    return 'All fields are required'
  }

  // Validate that fields are not just whitespace
  if ([event_title, location, date, times, artists].some(value => typeof value !== 'string' || value.trim().length === 0)) {
    return 'All fields must contain actual text'
  }

  // Validate date format
  const dateValidation = validateDateFormat(date)
  if (!dateValidation.valid) {
    return dateValidation.error!
  }

  // Validate external URL if provided
  if (event_external_url && event_external_url.trim()) {
    const urlValidation = validateURL(event_external_url)
    if (!urlValidation.valid) {
      return `Event External URL: ${urlValidation.error}`
    }
  }

  // Validate Instagram post URL if provided
  if (event_instagram_post && event_instagram_post.trim()) {
    const urlValidation = validateURL(event_instagram_post)
    if (!urlValidation.valid) {
      return `Event Instagram Post URL: ${urlValidation.error}`
    }
  }

  return null
}

/**
 * Build the stored event; optional fields are kept only when they have values
 */
function toEvent(body: Record<string, any>): Event {
  const { event_title, location, date, times, artists, event_external_url, event_instagram_post } = body
  return {
    event_title: event_title.trim(),
    location: location.trim(),
    date: date.trim(),
    times: times.trim(),
    artists: artists.trim(),
    ...(event_external_url && event_external_url.trim() && { event_external_url: event_external_url.trim() }),
    ...(event_instagram_post && event_instagram_post.trim() && { event_instagram_post: event_instagram_post.trim() }),
  }
}

/**
 * Download events.json; null only when the file does not exist yet
 */
async function readEvents(accessToken: string): Promise<EventsData | null> {
  const eventsData = await readDropboxJson<EventsData>(accessToken, EVENTS_FILE_PATH)
  if (eventsData && !Array.isArray(eventsData.events)) {
    throw new Error('events.json has no events list')
  }
  return eventsData
}

const writeEvents = (accessToken: string, eventsData: EventsData) => writeDropboxJson(accessToken, EVENTS_FILE_PATH, eventsData)

const reason = (error: unknown) => error instanceof Error ? error.message : String(error)

/**
 * GET /api/events - Fetch all events from Dropbox
 */
export async function GET() {
  try {
    const accessToken = await getValidAccessToken()
    const eventsData = await readEvents(accessToken)

    return NextResponse.json(eventsData ?? { events: [] })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: `Failed to fetch events: ${reason(error)}` },
      { status: 500 }
    )
  }
}

/**
 * POST /api/events - Add a new event to events.json
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validationError = validateEventFields(body)
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      )
    }

    const accessToken = await getValidAccessToken()

    // A failed read must stop here: writing anyway would replace every event with this one
    const eventsData = await readEvents(accessToken)
    const newEvent = toEvent(body)

    await writeEvents(accessToken, { ...eventsData, events: [...(eventsData?.events ?? []), newEvent] })

    return NextResponse.json({ success: true, event: newEvent })
  } catch (error) {
    console.error('Error adding event:', error)
    return NextResponse.json(
      { error: `Failed to add event: ${reason(error)}` },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/events - Update an existing event in events.json
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { index } = body

    if (index === undefined || index === null) {
      return NextResponse.json(
        { error: 'Index parameter is required' },
        { status: 400 }
      )
    }

    const eventIndex = parseInt(index, 10)
    if (isNaN(eventIndex) || eventIndex < 0) {
      return NextResponse.json(
        { error: 'Invalid index parameter' },
        { status: 400 }
      )
    }

    const validationError = validateEventFields(body)
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      )
    }

    const accessToken = await getValidAccessToken()

    const eventsData = await readEvents(accessToken)
    if (!eventsData) {
      return NextResponse.json(
        { error: 'Events file not found' },
        { status: 404 }
      )
    }

    // Validate index
    if (eventIndex >= eventsData.events.length) {
      return NextResponse.json(
        { error: 'Event index out of range' },
        { status: 400 }
      )
    }

    const updatedEvent = toEvent(body)

    await writeEvents(accessToken, {
      ...eventsData,
      events: eventsData.events.map((event, i) =>
        i === eventIndex ? updatedEvent : event
      ),
    })

    return NextResponse.json({ success: true, event: updatedEvent })
  } catch (error) {
    console.error('Error updating event:', error)
    return NextResponse.json(
      { error: `Failed to update event: ${reason(error)}` },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/events - Delete an event from events.json
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const index = searchParams.get('index')

    if (index === null) {
      return NextResponse.json(
        { error: 'Index parameter is required' },
        { status: 400 }
      )
    }

    const eventIndex = parseInt(index, 10)
    if (isNaN(eventIndex) || eventIndex < 0) {
      return NextResponse.json(
        { error: 'Invalid index parameter' },
        { status: 400 }
      )
    }

    const accessToken = await getValidAccessToken()

    const eventsData = await readEvents(accessToken)
    if (!eventsData) {
      return NextResponse.json(
        { error: 'Events file not found' },
        { status: 404 }
      )
    }

    // Validate index
    if (eventIndex >= eventsData.events.length) {
      return NextResponse.json(
        { error: 'Event index out of range' },
        { status: 400 }
      )
    }

    await writeEvents(accessToken, {
      ...eventsData,
      events: eventsData.events.filter((_, i) => i !== eventIndex),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting event:', error)
    return NextResponse.json(
      { error: `Failed to delete event: ${reason(error)}` },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/events - Set how many days past events stay in the website's main section: { recentDays }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { recentDays } = await request.json()
    if (!Number.isInteger(recentDays) || recentDays < 0 || recentDays > 365) {
      return NextResponse.json(
        { error: 'Days must be a whole number from 0 to 365' },
        { status: 400 }
      )
    }

    const accessToken = await getValidAccessToken()
    const eventsData = await readEvents(accessToken)

    await writeEvents(accessToken, { ...eventsData, events: eventsData?.events ?? [], recentDays })

    return NextResponse.json({ success: true, recentDays })
  } catch (error) {
    console.error('Error updating event display days:', error)
    return NextResponse.json(
      { error: `Failed to save the days setting: ${reason(error)}` },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getValidAccessToken } from '@/lib/dropbox'

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
 * GET /api/events - Fetch all events from Dropbox
 */
export async function GET() {
  try {
    const accessToken = await getValidAccessToken()

    // Download events.json from Dropbox
    const downloadResponse = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path: EVENTS_FILE_PATH }),
      },
    })

    if (!downloadResponse.ok) {
      if (downloadResponse.status === 409) {
        // File doesn't exist, return empty events array
        return NextResponse.json({ events: [] })
      }
      throw new Error(`Failed to download events.json: ${downloadResponse.status}`)
    }

    const eventsText = await downloadResponse.text()
    const eventsData: EventsData = JSON.parse(eventsText)

    return NextResponse.json(eventsData)
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
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
    const { event_title, location, date, times, artists, event_external_url, event_instagram_post } = body

    // Validate required fields
    if (!event_title || !location || !date || !times || !artists) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate that fields are not just whitespace
    if (
      event_title.trim().length === 0 ||
      location.trim().length === 0 ||
      date.trim().length === 0 ||
      times.trim().length === 0 ||
      artists.trim().length === 0
    ) {
      return NextResponse.json(
        { error: 'All fields must contain actual text' },
        { status: 400 }
      )
    }

    const accessToken = await getValidAccessToken()

    // First, get existing events
    let existingEvents: Event[] = []
    try {
      const downloadResponse = await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Dropbox-API-Arg': JSON.stringify({ path: EVENTS_FILE_PATH }),
        },
      })

      if (downloadResponse.ok) {
        const eventsText = await downloadResponse.text()
        const eventsData: EventsData = JSON.parse(eventsText)
        existingEvents = eventsData.events || []
      }
    } catch (error) {
      console.log('Events file does not exist or is empty, starting fresh')
    }

    // Add new event
    const newEvent: Event = {
      event_title: event_title.trim(),
      location: location.trim(),
      date: date.trim(),
      times: times.trim(),
      artists: artists.trim(),
      ...(event_external_url && event_external_url.trim() && { event_external_url: event_external_url.trim() }),
      ...(event_instagram_post && event_instagram_post.trim() && { event_instagram_post: event_instagram_post.trim() }),
    }

    const updatedEvents: EventsData = {
      events: [...existingEvents, newEvent],
    }

    // Upload updated events.json to Dropbox
    const uploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: EVENTS_FILE_PATH,
          mode: 'overwrite',
        }),
      },
      body: JSON.stringify(updatedEvents, null, 2),
    })

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload events.json: ${uploadResponse.status}`)
    }

    return NextResponse.json({ success: true, event: newEvent })
  } catch (error) {
    console.error('Error adding event:', error)
    return NextResponse.json(
      { error: 'Failed to add event' },
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
    const { index, event_title, location, date, times, artists, event_external_url, event_instagram_post } = body

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

    // Validate required fields
    if (!event_title || !location || !date || !times || !artists) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate that fields are not just whitespace
    if (
      event_title.trim().length === 0 ||
      location.trim().length === 0 ||
      date.trim().length === 0 ||
      times.trim().length === 0 ||
      artists.trim().length === 0
    ) {
      return NextResponse.json(
        { error: 'All fields must contain actual text' },
        { status: 400 }
      )
    }

    // Validate date format
    const dateValidation = validateDateFormat(date)
    if (!dateValidation.valid) {
      return NextResponse.json(
        { error: dateValidation.error },
        { status: 400 }
      )
    }

    // Validate external URL if provided
    if (event_external_url && event_external_url.trim()) {
      const urlValidation = validateURL(event_external_url)
      if (!urlValidation.valid) {
        return NextResponse.json(
          { error: `Event External URL: ${urlValidation.error}` },
          { status: 400 }
        )
      }
    }

    // Validate Instagram post URL if provided
    if (event_instagram_post && event_instagram_post.trim()) {
      const urlValidation = validateURL(event_instagram_post)
      if (!urlValidation.valid) {
        return NextResponse.json(
          { error: `Event Instagram Post URL: ${urlValidation.error}` },
          { status: 400 }
        )
      }
    }

    const accessToken = await getValidAccessToken()

    // Download existing events
    const downloadResponse = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path: EVENTS_FILE_PATH }),
      },
    })

    if (!downloadResponse.ok) {
      return NextResponse.json(
        { error: 'Events file not found' },
        { status: 404 }
      )
    }

    const eventsText = await downloadResponse.text()
    const eventsData: EventsData = JSON.parse(eventsText)

    // Validate index
    if (eventIndex >= eventsData.events.length) {
      return NextResponse.json(
        { error: 'Event index out of range' },
        { status: 400 }
      )
    }

    // Update event at index
    // Include optional fields only if they have values (empty strings mean clear the field)
    const updatedEvent: Event = {
      event_title: event_title.trim(),
      location: location.trim(),
      date: date.trim(),
      times: times.trim(),
      artists: artists.trim(),
      ...(event_external_url && event_external_url.trim() && { event_external_url: event_external_url.trim() }),
      ...(event_instagram_post && event_instagram_post.trim() && { event_instagram_post: event_instagram_post.trim() }),
    }

    const updatedEvents: EventsData = {
      events: eventsData.events.map((event, i) => 
        i === eventIndex ? updatedEvent : event
      ),
    }

    // Upload updated events.json to Dropbox
    const uploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: EVENTS_FILE_PATH,
          mode: 'overwrite',
        }),
      },
      body: JSON.stringify(updatedEvents, null, 2),
    })

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload events.json: ${uploadResponse.status}`)
    }

    return NextResponse.json({ success: true, event: updatedEvent })
  } catch (error) {
    console.error('Error updating event:', error)
    return NextResponse.json(
      { error: 'Failed to update event' },
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

    // Download existing events
    const downloadResponse = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path: EVENTS_FILE_PATH }),
      },
    })

    if (!downloadResponse.ok) {
      return NextResponse.json(
        { error: 'Events file not found' },
        { status: 404 }
      )
    }

    const eventsText = await downloadResponse.text()
    const eventsData: EventsData = JSON.parse(eventsText)

    // Validate index
    if (eventIndex >= eventsData.events.length) {
      return NextResponse.json(
        { error: 'Event index out of range' },
        { status: 400 }
      )
    }

    // Remove event at index
    const updatedEvents: EventsData = {
      events: eventsData.events.filter((_, i) => i !== eventIndex),
    }

    // Upload updated events.json to Dropbox
    const uploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: EVENTS_FILE_PATH,
          mode: 'overwrite',
        }),
      },
      body: JSON.stringify(updatedEvents, null, 2),
    })

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload events.json: ${uploadResponse.status}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting event:', error)
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    )
  }
}


"use client"

import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ConfirmationDialog,
} from '@/components/ui/confirmation-dialog'
import { Calendar, Plus, Trash2, Edit2, MapPin, Users as UsersIcon, Clock, Loader2, ExternalLink, Instagram } from 'lucide-react'
import { DEFAULT_RECENT_DAYS, eventStatuses, type EventStatus } from '@/lib/event-display'

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
  recentDays?: number
}

// The website reads DD/MM/YYYY; the date picker works in YYYY-MM-DD
const toPickerDate = (date: string) => {
  const match = date.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : ''
}
const fromPickerDate = (date: string) => {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

// The stored date, split for the calendar block
const dateParts = (date: string) => {
  const match = date.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const month = new Date(2000, Number(match[2]) - 1).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()
  return { day: match[1].padStart(2, '0'), month, year: match[3] }
}

// Links are often pasted without the scheme; the website only shows http(s) links
const withScheme = (url: string) => {
  const value = url.trim()
  return !value || /^https?:\/\//i.test(value) ? value : `https://${value}`
}

// The server's own message says what went wrong; fall back to the status when there is none
const readError = async (response: Response, fallback: string) => {
  const data = await response.json().catch(() => null)
  return data?.error || `${fallback} (${response.status})`
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  // Days a past event stays in the website's main section; the draft is what the input shows
  const [recentDays, setRecentDays] = useState(DEFAULT_RECENT_DAYS)
  const [daysDraft, setDaysDraft] = useState(String(DEFAULT_RECENT_DAYS))
  const [savingDays, setSavingDays] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    event_title: '',
    location: '',
    date: '',
    times: '',
    artists: '',
    event_external_url: '',
    event_instagram_post: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch events on mount
  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const response = await fetch('/api/events')
      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to fetch events'))
      }
      const data: EventsData = await response.json()
      setEvents(data.events || [])
      const days = Number.isInteger(data.recentDays) ? data.recentDays! : DEFAULT_RECENT_DAYS
      setRecentDays(days)
      setDaysDraft(String(days))
    } catch (error) {
      console.error('Error fetching events:', error)
      setLoadError(error instanceof Error ? error.message : 'Failed to fetch events')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.event_title.trim()) {
      errors.event_title = 'Event title is required'
    }
    if (!formData.location.trim()) {
      errors.location = 'Location is required'
    }
    // The date picker only yields complete, real dates
    if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) {
      errors.date = 'Date is required'
    }
    if (!formData.times.trim()) {
      errors.times = 'Times are required'
    }
    if (!formData.artists.trim()) {
      errors.artists = 'Artists are required'
    }
    
    // Validate external URL if provided
    if (formData.event_external_url.trim()) {
      try {
        const url = new URL(withScheme(formData.event_external_url))
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.event_external_url = 'URL must start with http:// or https://'
        }
      } catch {
        errors.event_external_url = 'Please enter a valid URL (https://example.com/event)'
      }
    }
    
    // Validate Instagram post URL if provided
    if (formData.event_instagram_post.trim()) {
      try {
        const url = new URL(withScheme(formData.event_instagram_post))
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.event_instagram_post = 'URL must start with http:// or https://'
        }
      } catch {
        errors.event_instagram_post = 'Please enter a valid URL (https://www.instagram.com/p/...)'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const openAddDialog = () => {
    setIsEditing(false)
    setEditingIndex(null)
    setFormData({
      event_title: '',
      location: '',
      date: '',
      times: '',
      artists: '',
      event_external_url: '',
      event_instagram_post: '',
    })
    setFormErrors({})
    setIsDialogOpen(true)
  }

  const openEditDialog = (index: number) => {
    const event = events[index]
    setIsEditing(true)
    setEditingIndex(index)
    setFormData({
      event_title: event.event_title,
      location: event.location,
      date: toPickerDate(event.date),
      times: event.times,
      artists: event.artists,
      event_external_url: event.event_external_url || '',
      event_instagram_post: event.event_instagram_post || '',
    })
    setFormErrors({})
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setIsEditing(false)
    setEditingIndex(null)
    setFormData({
      event_title: '',
      location: '',
      date: '',
      times: '',
      artists: '',
      event_external_url: '',
      event_instagram_post: '',
    })
    setFormErrors({})
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const event = {
      ...formData,
      date: fromPickerDate(formData.date),
      event_external_url: withScheme(formData.event_external_url),
      event_instagram_post: withScheme(formData.event_instagram_post),
    }

    try {
      setIsSubmitting(true)

      if (isEditing && editingIndex !== null) {
        // Update existing event
        const response = await fetch('/api/events', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            index: editingIndex,
            ...event,
          }),
        })

        if (!response.ok) {
          throw new Error(await readError(response, 'Failed to update event'))
        }
      } else {
        // Add new event
        const response = await fetch('/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        })

        if (!response.ok) {
          throw new Error(await readError(response, 'Failed to add event'))
        }
      }

      closeDialog()
      
      // Refresh events list
      await fetchEvents()
    } catch (error) {
      console.error('Error saving event:', error)
      alert(error instanceof Error ? error.message : 'Failed to save event')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (index: number) => {
    setDeleteIndex(index)
    setIsDeleting(true)
  }

  const handleDeleteConfirm = async () => {
    if (deleteIndex === null) return

    try {
      const response = await fetch(`/api/events?index=${deleteIndex}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to delete event'))
      }

      setIsDeleting(false)
      setDeleteIndex(null)
      
      // Refresh events list
      await fetchEvents()
    } catch (error) {
      console.error('Error deleting event:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete event')
      setIsDeleting(false)
      setDeleteIndex(null)
    }
  }

  const handleDeleteCancel = () => {
    setIsDeleting(false)
    setDeleteIndex(null)
  }

  const saveDays = async () => {
    const days = Number(daysDraft)
    if (!Number.isInteger(days) || days < 0 || days > 365) {
      alert('Days must be a whole number from 0 to 365')
      return
    }
    try {
      setSavingDays(true)
      const response = await fetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recentDays: days }),
      })
      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to save the days setting'))
      }
      setRecentDays(days)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save the days setting')
    } finally {
      setSavingDays(false)
    }
  }

  const statuses = eventStatuses(events, recentDays)
  const shownCount = statuses.filter(status => status.kind === 'shown').length

  const statusBadge = (status: EventStatus) => {
    const [tone, label] =
      status.kind === 'shown' ? ['bg-positive/15 text-positive', 'On the website'] :
      status.kind === 'full' ? ['bg-caution/15 text-caution', 'Not shown · only 3 fit'] :
      status.kind === 'archive' ? ['bg-muted text-muted-foreground', `Archive only · ${status.daysAgo} days ago`] :
      ['bg-destructive/10 text-destructive', 'Not shown · date unreadable']
    return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{label}</span>
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Add Button */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-3xl text-foreground sm:text-4xl">Events</h1>
            <p className="text-muted-foreground mt-1">Manage your events</p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus />
            Add Event
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="p-8 text-center sm:p-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Loading events...</p>
            </CardContent>
          </Card>
        )}

        {/* What the website shows */}
        {!loading && !loadError && (
          <Card className="gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0">
              <p className="font-medium text-foreground">{shownCount} of {events.length} on the website&rsquo;s main events section</p>
              <p className="text-sm text-muted-foreground">Older events stay in the Full Programme archive.</p>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="recent-days" className="shrink-0 text-sm text-muted-foreground">Keep past events for</Label>
              <Input
                id="recent-days"
                type="number"
                inputMode="numeric"
                min={0}
                max={365}
                value={daysDraft}
                onChange={(e) => setDaysDraft(e.target.value)}
                className="w-20 text-center"
              />
              <span className="text-sm text-muted-foreground">days</span>
              <Button size="sm" onClick={saveDays} disabled={savingDays || daysDraft === String(recentDays)}>
                {savingDays ? <Loader2 className="animate-spin" /> : null}
                Save
              </Button>
            </div>
          </Card>
        )}

        {/* Error State */}
        {!loading && loadError && (
          <Card>
            <CardContent className="p-8 text-center sm:p-12">
              <Calendar className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <h2 className="mb-2 text-xl font-semibold text-foreground">Events could not be loaded</h2>
              <p className="text-muted-foreground mb-4">{loadError}</p>
              <Button onClick={fetchEvents}>Try again</Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !loadError && events.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center sm:p-12">
              <Calendar className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <h2 className="mb-2 text-xl font-semibold text-foreground">No events yet</h2>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first event.
              </p>
              <Button onClick={openAddDialog}>
                <Plus />
                Add Event
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Events List */}
        {!loading && !loadError && events.length > 0 && (
          <div className="grid gap-3">
            {events.map((event, index) => {
              const date = dateParts(event.date)
              return (
                <Card key={index} className="flex-row overflow-hidden">
                  <div className="flex w-[4.5rem] shrink-0 flex-col items-center justify-center gap-0.5 border-r bg-muted/60 py-4 sm:w-24">
                    {date ? (
                      <>
                        <span className="font-display text-2xl leading-none text-foreground sm:text-3xl">{date.day}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{date.month}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{date.year}</span>
                      </>
                    ) : (
                      <span className="px-1 text-center text-xs text-muted-foreground">{event.date}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 break-words pt-1 text-lg font-semibold leading-snug text-foreground">
                        {event.event_title}
                      </h3>
                      <div className="-mr-2 -mt-2 flex shrink-0 items-center">
                        <Button variant="ghost" size="icon" aria-label={`Edit ${event.event_title}`} onClick={() => openEditDialog(index)}>
                          <Edit2 />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${event.event_title}`}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDeleteClick(index)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2">{statusBadge(statuses[index])}</div>
                    <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span className="min-w-0">{event.times}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="min-w-0">{event.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UsersIcon className="h-4 w-4 shrink-0" />
                        <span className="min-w-0">{event.artists}</span>
                      </div>
                    </div>
                    {(event.event_external_url || event.event_instagram_post) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {event.event_external_url && (
                          <a
                            href={event.event_external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-input px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:h-8"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            External URL
                          </a>
                        )}
                        {event.event_instagram_post && (
                          <a
                            href={event.event_instagram_post}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-input px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:h-8"
                          >
                            <Instagram className="h-3.5 w-3.5" />
                            Instagram Post
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Add/Edit Event Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Event' : 'Add New Event'}</DialogTitle>
              <DialogDescription>
                Fill in all the details for the event. Fields marked with (Optional) are not required.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="event_title">Event Title</Label>
                  <Input
                    id="event_title"
                    value={formData.event_title}
                    onChange={(e) => handleInputChange('event_title', e.target.value)}
                    placeholder="Collecting Dots Showcase"
                    className={formErrors.event_title ? 'border-destructive' : ''}
                  />
                  {formErrors.event_title && (
                    <p className="text-sm text-destructive">{formErrors.event_title}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Event Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    className={formErrors.date ? 'border-destructive' : ''}
                  />
                  {formErrors.date && (
                    <p className="text-sm text-destructive">{formErrors.date}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="times">Event Times</Label>
                  <Input
                    id="times"
                    value={formData.times}
                    onChange={(e) => handleInputChange('times', e.target.value)}
                    placeholder="12:00 - 22:00"
                    className={formErrors.times ? 'border-destructive' : ''}
                  />
                  <p className="text-xs text-muted-foreground">Example: 12:00 - 22:00</p>
                  {formErrors.times && (
                    <p className="text-sm text-destructive">{formErrors.times}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Event Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Warehouse 23, Berlin, Germany"
                    className={formErrors.location ? 'border-destructive' : ''}
                  />
                  {formErrors.location && (
                    <p className="text-sm text-destructive">{formErrors.location}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="artists">Event Artists</Label>
                  <Input
                    id="artists"
                    value={formData.artists}
                    onChange={(e) => handleInputChange('artists', e.target.value)}
                    placeholder="OMRI., Dor Danino, Abel, Prlli, Lovers"
                    className={formErrors.artists ? 'border-destructive' : ''}
                  />
                  <p className="text-xs text-muted-foreground">Artist names separated by commas (OMRI., Dor Danino, Abel, Prlli, Lovers)</p>
                  {formErrors.artists && (
                    <p className="text-sm text-destructive">{formErrors.artists}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event_external_url">Event External URL (Optional)</Label>
                  <Input
                    id="event_external_url"
                    inputMode="url"
                    autoCapitalize="none"
                    value={formData.event_external_url}
                    onChange={(e) => handleInputChange('event_external_url', e.target.value)}
                    placeholder="https://example.com/event"
                    className={formErrors.event_external_url ? 'border-destructive' : ''}
                  />
                  {!formErrors.event_external_url && formData.event_external_url && (
                    <p className="text-xs text-muted-foreground">Must be a valid URL starting with http:// or https://</p>
                  )}
                  {formErrors.event_external_url && (
                    <p className="text-sm text-destructive">{formErrors.event_external_url}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event_instagram_post">Event Instagram Post URL (Optional)</Label>
                  <Input
                    id="event_instagram_post"
                    inputMode="url"
                    autoCapitalize="none"
                    value={formData.event_instagram_post}
                    onChange={(e) => handleInputChange('event_instagram_post', e.target.value)}
                    placeholder="https://www.instagram.com/p/..."
                    className={formErrors.event_instagram_post ? 'border-destructive' : ''}
                  />
                  {!formErrors.event_instagram_post && formData.event_instagram_post && (
                    <p className="text-xs text-muted-foreground">Must be a valid URL starting with http:// or https://</p>
                  )}
                  {formErrors.event_instagram_post && (
                    <p className="text-sm text-destructive">{formErrors.event_instagram_post}</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" />
                      {isEditing ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    isEditing ? 'Update Event' : 'Add Event'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        {isDeleting && deleteIndex !== null && (
          <ConfirmationDialog
            isOpen={isDeleting}
            onClose={handleDeleteCancel}
            onConfirm={() => {
              handleDeleteConfirm()
            }}
            title="Delete Event"
            description={`Are you sure you want to delete "${events[deleteIndex]?.event_title}"? This action cannot be undone.`}
            confirmText="Delete"
            type="destructive"
            trackTitle={events[deleteIndex]?.event_title}
            isLoading={false}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

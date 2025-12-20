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
import { Calendar, Plus, Trash2, Edit2, MapPin, Users as UsersIcon, CalendarDays, Clock, Loader2, ExternalLink, Instagram } from 'lucide-react'

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

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
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
      const response = await fetch('/api/events')
      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }
      const data: EventsData = await response.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error('Error fetching events:', error)
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
    if (!formData.date.trim()) {
      errors.date = 'Date is required'
    }
    if (!formData.times.trim()) {
      errors.times = 'Times are required'
    }
    if (!formData.artists.trim()) {
      errors.artists = 'Artists are required'
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
      date: event.date,
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
            ...formData,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update event')
        }
      } else {
        // Add new event
        const response = await fetch('/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to add event')
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
        throw new Error('Failed to delete event')
      }

      setIsDeleting(false)
      setDeleteIndex(null)
      
      // Refresh events list
      await fetchEvents()
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Failed to delete event')
      setIsDeleting(false)
      setDeleteIndex(null)
    }
  }

  const handleDeleteCancel = () => {
    setIsDeleting(false)
    setDeleteIndex(null)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Add Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Events</h1>
            <p className="text-muted-foreground mt-1">Manage your events</p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Loading events...</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && events.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-foreground mb-2">No events yet</h2>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first event.
              </p>
              <Button onClick={openAddDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Events List */}
        {!loading && events.length > 0 && (
          <div className="grid gap-4">
            {events.map((event, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-foreground mb-3">
                        {event.event_title}
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CalendarDays className="w-4 h-4" />
                          <span>{event.date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{event.times}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <UsersIcon className="w-4 h-4" />
                          <span>{event.artists}</span>
                        </div>
                        {event.event_external_url && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <ExternalLink className="w-4 h-4" />
                            <a 
                              href={event.event_external_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              External URL
                            </a>
                          </div>
                        )}
                        {event.event_instagram_post && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Instagram className="w-4 h-4" />
                            <a 
                              href={event.event_instagram_post} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Instagram Post
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(index)}
                        className="text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(index)}
                        className="text-red-600 dark:text-red-400 border-red-600 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
                    placeholder="e.g., Collecting Dots Showcase"
                    className={formErrors.event_title ? 'border-red-500' : ''}
                  />
                  {formErrors.event_title && (
                    <p className="text-sm text-red-600 dark:text-red-400">{formErrors.event_title}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Event Date</Label>
                  <Input
                    id="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    placeholder="e.g., 28/12/2025"
                    className={formErrors.date ? 'border-red-500' : ''}
                  />
                  {formErrors.date && (
                    <p className="text-sm text-red-500">{formErrors.date}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="times">Event Times</Label>
                  <Input
                    id="times"
                    value={formData.times}
                    onChange={(e) => handleInputChange('times', e.target.value)}
                    placeholder="e.g., 08:00 - 23:00"
                    className={formErrors.times ? 'border-red-500' : ''}
                  />
                  {formErrors.times && (
                    <p className="text-sm text-red-500">{formErrors.times}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Event Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="e.g., Warehouse 23, Berlin, Germany"
                    className={formErrors.location ? 'border-red-500' : ''}
                  />
                  {formErrors.location && (
                    <p className="text-sm text-red-500">{formErrors.location}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="artists">Event Artists</Label>
                  <Input
                    id="artists"
                    value={formData.artists}
                    onChange={(e) => handleInputChange('artists', e.target.value)}
                    placeholder="e.g., Omri., Adaru, Sapian"
                    className={formErrors.artists ? 'border-red-500' : ''}
                  />
                  {formErrors.artists && (
                    <p className="text-sm text-red-500">{formErrors.artists}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event_external_url">Event External URL (Optional)</Label>
                  <Input
                    id="event_external_url"
                    type="url"
                    value={formData.event_external_url}
                    onChange={(e) => handleInputChange('event_external_url', e.target.value)}
                    placeholder="https://example.com/event"
                    className={formErrors.event_external_url ? 'border-red-500' : ''}
                  />
                  {formErrors.event_external_url && (
                    <p className="text-sm text-red-500">{formErrors.event_external_url}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="event_instagram_post">Event Instagram Post URL (Optional)</Label>
                  <Input
                    id="event_instagram_post"
                    type="url"
                    value={formData.event_instagram_post}
                    onChange={(e) => handleInputChange('event_instagram_post', e.target.value)}
                    placeholder="https://www.instagram.com/p/..."
                    className={formErrors.event_instagram_post ? 'border-red-500' : ''}
                  />
                  {formErrors.event_instagram_post && (
                    <p className="text-sm text-red-500">{formErrors.event_instagram_post}</p>
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
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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

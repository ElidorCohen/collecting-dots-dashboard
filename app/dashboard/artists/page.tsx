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
import { Users, Plus, Trash2, Edit2, Instagram, Music, Loader2 } from 'lucide-react'
import { normalizeArtist, validateArtist, type Artist } from '@/lib/artist-fields'

interface ArtistsData {
  artists: Artist[]
}

// The server's own message says what went wrong; fall back to the status when there is none
const readError = async (response: Response, fallback: string) => {
  const data = await response.json().catch(() => null)
  return data?.error || `${fallback} (${response.status})`
}

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    artist_name: '',
    artist_instagram_username: '',
    artist_soundcloud: '',
    artist_spotify: '',
    artist_beatport: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch artists on mount
  useEffect(() => {
    fetchArtists()
  }, [])

  const fetchArtists = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const response = await fetch('/api/artists')
      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to fetch artists'))
      }
      const data: ArtistsData = await response.json()
      setArtists(data.artists || [])
    } catch (error) {
      console.error('Error fetching artists:', error)
      setLoadError(error instanceof Error ? error.message : 'Failed to fetch artists')
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
    // The same rules the API applies, so the form never sends what the server would reject
    const errors = validateArtist(normalizeArtist(formData)) as Record<string, string>
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const openAddDialog = () => {
    setIsEditing(false)
    setEditingIndex(null)
    setFormData({
      artist_name: '',
      artist_instagram_username: '',
      artist_soundcloud: '',
      artist_spotify: '',
      artist_beatport: '',
    })
    setFormErrors({})
    setIsDialogOpen(true)
  }

  const openEditDialog = (index: number) => {
    const artist = artists[index]
    setIsEditing(true)
    setEditingIndex(index)
    setFormData({
      artist_name: artist.artist_name || '',
      artist_instagram_username: artist.artist_instagram_username || '',
      artist_soundcloud: artist.artist_soundcloud || '',
      artist_spotify: artist.artist_spotify || '',
      artist_beatport: artist.artist_beatport || '',
    })
    setFormErrors({})
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setIsEditing(false)
    setEditingIndex(null)
    setFormData({
      artist_name: '',
      artist_instagram_username: '',
      artist_soundcloud: '',
      artist_spotify: '',
      artist_beatport: '',
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
        // Update existing artist
        const response = await fetch('/api/artists', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            index: editingIndex,
            ...normalizeArtist(formData),
          }),
        })

        if (!response.ok) {
          throw new Error(await readError(response, 'Failed to update artist'))
        }
      } else {
        // Add new artist
        const response = await fetch('/api/artists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(normalizeArtist(formData)),
        })

        if (!response.ok) {
          throw new Error(await readError(response, 'Failed to add artist'))
        }
      }

      closeDialog()
      
      // Refresh artists list
      await fetchArtists()
    } catch (error) {
      console.error('Error saving artist:', error)
      alert(error instanceof Error ? error.message : 'Failed to save artist')
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
      const response = await fetch(`/api/artists?index=${deleteIndex}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to delete artist'))
      }

      setIsDeleting(false)
      setDeleteIndex(null)
      
      // Refresh artists list
      await fetchArtists()
    } catch (error) {
      console.error('Error deleting artist:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete artist')
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
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-3xl text-foreground sm:text-4xl">Artists</h1>
            <p className="text-muted-foreground mt-1">Manage your artists</p>
            <p className="mt-1 text-xs text-muted-foreground">Artists order decided by popularity</p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus />
            Add Artist
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="p-8 text-center sm:p-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Loading artists...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {!loading && loadError && (
          <Card>
            <CardContent className="p-8 text-center sm:p-12">
              <Users className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <h2 className="mb-2 text-xl font-semibold text-foreground">Artists could not be loaded</h2>
              <p className="text-muted-foreground mb-4">{loadError}</p>
              <Button onClick={fetchArtists}>Try again</Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !loadError && artists.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center sm:p-12">
              <Users className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <h2 className="mb-2 text-xl font-semibold text-foreground">No artists yet</h2>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first artist.
              </p>
              <Button onClick={openAddDialog}>
                <Plus />
                Add Artist
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Artists List */}
        {!loading && !loadError && artists.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {artists.map((artist, index) => {
              const links = [
                { label: `@${artist.artist_instagram_username}`, href: `https://instagram.com/${artist.artist_instagram_username?.replace('@', '')}`, icon: Instagram, show: artist.artist_instagram_username },
                { label: 'SoundCloud', href: artist.artist_soundcloud, icon: Music, show: artist.artist_soundcloud },
                { label: 'Spotify', href: artist.artist_spotify, icon: Music, show: artist.artist_spotify },
                { label: 'Beatport', href: artist.artist_beatport, icon: Music, show: artist.artist_beatport },
              ].filter(link => link.show)
              return (
                <Card key={index} className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 break-words pt-1 text-lg font-semibold leading-snug text-foreground">
                      {artist.artist_name}
                    </h3>
                    <div className="-mr-2 -mt-2 flex shrink-0 items-center">
                      <Button variant="ghost" size="icon" aria-label={`Edit ${artist.artist_name}`} onClick={() => openEditDialog(index)}>
                        <Edit2 />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${artist.artist_name}`}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDeleteClick(index)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {links.map(({ label, href, icon: Icon }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 max-w-full items-center gap-1.5 rounded-full border border-input px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:h-8"
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{label}</span>
                      </a>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Add/Edit Artist Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Artist' : 'Add New Artist'}</DialogTitle>
              <DialogDescription>
                The artist photo on the website comes from their Spotify profile. Fields marked with (Optional) are not required.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="artist_name">Artist Name</Label>
                  <Input
                    id="artist_name"
                    value={formData.artist_name}
                    onChange={(e) => handleInputChange('artist_name', e.target.value)}
                    placeholder="Omri."
                    className={formErrors.artist_name ? 'border-destructive' : ''}
                  />
                  {formErrors.artist_name && (
                    <p className="text-sm text-destructive">{formErrors.artist_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="artist_instagram_username">Instagram Username (Optional)</Label>
                  <Input
                    id="artist_instagram_username"
                    value={formData.artist_instagram_username}
                    onChange={(e) => handleInputChange('artist_instagram_username', e.target.value)}
                    placeholder="rafael__music"
                    className={formErrors.artist_instagram_username ? 'border-destructive' : ''}
                  />
                  {formErrors.artist_instagram_username && (
                    <p className="text-sm text-destructive">{formErrors.artist_instagram_username}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="artist_soundcloud">SoundCloud URL (Optional)</Label>
                  <Input
                    id="artist_soundcloud"
                    inputMode="url"
                    autoCapitalize="none"
                    value={formData.artist_soundcloud}
                    onChange={(e) => handleInputChange('artist_soundcloud', e.target.value)}
                    placeholder="https://soundcloud.com/..."
                    className={formErrors.artist_soundcloud ? 'border-destructive' : ''}
                  />
                  {!formErrors.artist_soundcloud && formData.artist_soundcloud && (
                    <p className="text-xs text-muted-foreground">Must be a valid SoundCloud URL</p>
                  )}
                  {formErrors.artist_soundcloud && (
                    <p className="text-sm text-destructive">{formErrors.artist_soundcloud}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="artist_spotify">Spotify URL</Label>
                  <Input
                    id="artist_spotify"
                    inputMode="url"
                    autoCapitalize="none"
                    value={formData.artist_spotify}
                    onChange={(e) => handleInputChange('artist_spotify', e.target.value)}
                    placeholder="https://open.spotify.com/artist/..."
                    className={formErrors.artist_spotify ? 'border-destructive' : ''}
                  />
                  {!formErrors.artist_spotify && formData.artist_spotify && (
                    <p className="text-xs text-muted-foreground">The artist profile link; the website uses it for the photo</p>
                  )}
                  {formErrors.artist_spotify && (
                    <p className="text-sm text-destructive">{formErrors.artist_spotify}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="artist_beatport">Beatport URL (Optional)</Label>
                  <Input
                    id="artist_beatport"
                    inputMode="url"
                    autoCapitalize="none"
                    value={formData.artist_beatport}
                    onChange={(e) => handleInputChange('artist_beatport', e.target.value)}
                    placeholder="https://www.beatport.com/artist/..."
                    className={formErrors.artist_beatport ? 'border-destructive' : ''}
                  />
                  {!formErrors.artist_beatport && formData.artist_beatport && (
                    <p className="text-xs text-muted-foreground">Must be a valid Beatport URL</p>
                  )}
                  {formErrors.artist_beatport && (
                    <p className="text-sm text-destructive">{formErrors.artist_beatport}</p>
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
                    isEditing ? 'Update Artist' : 'Add Artist'
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
            title="Delete Artist"
            description={`Are you sure you want to delete "${artists[deleteIndex]?.artist_name}"? This action cannot be undone.`}
            confirmText="Delete"
            type="destructive"
            trackTitle={artists[deleteIndex]?.artist_name}
            isLoading={false}
          />
        )}
      </div>
    </DashboardLayout>
  )
}


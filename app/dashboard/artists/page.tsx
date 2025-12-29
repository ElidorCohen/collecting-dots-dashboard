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
import { Users, Plus, Trash2, Edit2, Instagram, Music, ExternalLink, Loader2 } from 'lucide-react'

interface Artist {
  artist_name: string
  artist_instagram_username: string
  artist_soundcloud: string
  artist_spotify: string
  artist_beatport: string
}

interface ArtistsData {
  artists: Artist[]
}

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
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
      const response = await fetch('/api/artists')
      if (!response.ok) {
        throw new Error('Failed to fetch artists')
      }
      const data: ArtistsData = await response.json()
      setArtists(data.artists || [])
    } catch (error) {
      console.error('Error fetching artists:', error)
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

    if (!formData.artist_name.trim()) {
      errors.artist_name = 'Artist name is required'
    }
    if (!formData.artist_instagram_username.trim()) {
      errors.artist_instagram_username = 'Instagram username is required'
    }
    if (!formData.artist_soundcloud.trim()) {
      errors.artist_soundcloud = 'SoundCloud URL is required'
    } else {
      // Validate SoundCloud URL
      try {
        const url = new URL(formData.artist_soundcloud.trim())
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.artist_soundcloud = 'URL must start with http:// or https://'
        } else if (!url.hostname.includes('soundcloud.com')) {
          errors.artist_soundcloud = 'Must be a SoundCloud URL (soundcloud.com)'
        }
      } catch {
        errors.artist_soundcloud = 'Please enter a valid SoundCloud URL'
      }
    }
    if (!formData.artist_spotify.trim()) {
      errors.artist_spotify = 'Spotify URL is required'
    } else {
      // Validate Spotify URL
      try {
        const url = new URL(formData.artist_spotify.trim())
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.artist_spotify = 'URL must start with http:// or https://'
        } else if (!url.hostname.includes('spotify.com')) {
          errors.artist_spotify = 'Must be a Spotify URL (spotify.com)'
        }
      } catch {
        errors.artist_spotify = 'Please enter a valid Spotify URL'
      }
    }
    if (!formData.artist_beatport.trim()) {
      errors.artist_beatport = 'Beatport URL is required'
    } else {
      // Validate Beatport URL
      try {
        const url = new URL(formData.artist_beatport.trim())
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.artist_beatport = 'URL must start with http:// or https://'
        } else if (!url.hostname.includes('beatport.com')) {
          errors.artist_beatport = 'Must be a Beatport URL (beatport.com)'
        }
      } catch {
        errors.artist_beatport = 'Please enter a valid Beatport URL'
      }
    }

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
      artist_name: artist.artist_name,
      artist_instagram_username: artist.artist_instagram_username,
      artist_soundcloud: artist.artist_soundcloud,
      artist_spotify: artist.artist_spotify,
      artist_beatport: artist.artist_beatport,
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
            ...formData,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update artist')
        }
      } else {
        // Add new artist
        const response = await fetch('/api/artists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to add artist')
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
        throw new Error('Failed to delete artist')
      }

      setIsDeleting(false)
      setDeleteIndex(null)
      
      // Refresh artists list
      await fetchArtists()
    } catch (error) {
      console.error('Error deleting artist:', error)
      alert('Failed to delete artist')
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
            <h1 className="text-3xl font-bold text-foreground">Artists</h1>
            <p className="text-muted-foreground mt-1">Manage your artists</p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Artist
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Loading artists...</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && artists.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-foreground mb-2">No artists yet</h2>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first artist.
              </p>
              <Button onClick={openAddDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Artist
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Artists List */}
        {!loading && artists.length > 0 && (
          <div className="grid gap-4">
            {artists.map((artist, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-foreground mb-4">
                        {artist.artist_name}
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Instagram className="w-4 h-4" />
                          <span className="font-medium">Instagram:</span>
                          <a
                            href={`https://instagram.com/${artist.artist_instagram_username.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                          >
                            @{artist.artist_instagram_username}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Music className="w-4 h-4" />
                          <span className="font-medium">SoundCloud:</span>
                          <a
                            href={artist.artist_soundcloud}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                          >
                            View Profile
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Music className="w-4 h-4" />
                          <span className="font-medium">Spotify:</span>
                          <a
                            href={artist.artist_spotify}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                          >
                            View Profile
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Music className="w-4 h-4" />
                          <span className="font-medium">Beatport:</span>
                          <a
                            href={artist.artist_beatport}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                          >
                            View Profile
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
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

        {/* Add/Edit Artist Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Artist' : 'Add New Artist'}</DialogTitle>
              <DialogDescription>
                Fill in all the details for the artist. All fields are required.
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
                    className={formErrors.artist_name ? 'border-red-500' : ''}
                  />
                  {formErrors.artist_name && (
                    <p className="text-sm text-red-600 dark:text-red-400">{formErrors.artist_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="artist_instagram_username">Instagram Username</Label>
                  <Input
                    id="artist_instagram_username"
                    value={formData.artist_instagram_username}
                    onChange={(e) => handleInputChange('artist_instagram_username', e.target.value)}
                    placeholder="rafael__music"
                    className={formErrors.artist_instagram_username ? 'border-red-500' : ''}
                  />
                  {formErrors.artist_instagram_username && (
                    <p className="text-sm text-red-600 dark:text-red-400">{formErrors.artist_instagram_username}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="artist_soundcloud">SoundCloud URL</Label>
                  <Input
                    id="artist_soundcloud"
                    type="url"
                    value={formData.artist_soundcloud}
                    onChange={(e) => handleInputChange('artist_soundcloud', e.target.value)}
                    placeholder="https://soundcloud.com/..."
                    className={formErrors.artist_soundcloud ? 'border-red-500' : ''}
                  />
                  {!formErrors.artist_soundcloud && formData.artist_soundcloud && (
                    <p className="text-xs text-muted-foreground">Must be a valid SoundCloud URL</p>
                  )}
                  {formErrors.artist_soundcloud && (
                    <p className="text-sm text-red-600 dark:text-red-400">{formErrors.artist_soundcloud}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="artist_spotify">Spotify URL</Label>
                  <Input
                    id="artist_spotify"
                    type="url"
                    value={formData.artist_spotify}
                    onChange={(e) => handleInputChange('artist_spotify', e.target.value)}
                    placeholder="https://open.spotify.com/artist/..."
                    className={formErrors.artist_spotify ? 'border-red-500' : ''}
                  />
                  {!formErrors.artist_spotify && formData.artist_spotify && (
                    <p className="text-xs text-muted-foreground">Must be a valid Spotify URL</p>
                  )}
                  {formErrors.artist_spotify && (
                    <p className="text-sm text-red-600 dark:text-red-400">{formErrors.artist_spotify}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="artist_beatport">Beatport URL</Label>
                  <Input
                    id="artist_beatport"
                    type="url"
                    value={formData.artist_beatport}
                    onChange={(e) => handleInputChange('artist_beatport', e.target.value)}
                    placeholder="https://www.beatport.com/artist/..."
                    className={formErrors.artist_beatport ? 'border-red-500' : ''}
                  />
                  {!formErrors.artist_beatport && formData.artist_beatport && (
                    <p className="text-xs text-muted-foreground">Must be a valid Beatport URL</p>
                  )}
                  {formErrors.artist_beatport && (
                    <p className="text-sm text-red-600 dark:text-red-400">{formErrors.artist_beatport}</p>
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


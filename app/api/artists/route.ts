import { NextRequest, NextResponse } from 'next/server'
import { getValidAccessToken } from '@/lib/dropbox'

const ARTISTS_FILE_PATH = '/artists/artist_urls.json'

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

/**
 * Validate SoundCloud URL
 */
function validateSoundCloudURL(url: string): { valid: boolean; error?: string } {
  try {
    const urlObj = new URL(url.trim())
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'URL must start with http:// or https://' }
    }
    if (!urlObj.hostname.includes('soundcloud.com')) {
      return { valid: false, error: 'Must be a SoundCloud URL (soundcloud.com)' }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: 'Please enter a valid SoundCloud URL' }
  }
}

/**
 * Validate Spotify URL
 */
function validateSpotifyURL(url: string): { valid: boolean; error?: string } {
  try {
    const urlObj = new URL(url.trim())
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'URL must start with http:// or https://' }
    }
    if (!urlObj.hostname.includes('spotify.com')) {
      return { valid: false, error: 'Must be a Spotify URL (spotify.com)' }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: 'Please enter a valid Spotify URL' }
  }
}

/**
 * Validate Beatport URL
 */
function validateBeatportURL(url: string): { valid: boolean; error?: string } {
  try {
    const urlObj = new URL(url.trim())
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'URL must start with http:// or https://' }
    }
    if (!urlObj.hostname.includes('beatport.com')) {
      return { valid: false, error: 'Must be a Beatport URL (beatport.com)' }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: 'Please enter a valid Beatport URL' }
  }
}

/**
 * GET /api/artists - Fetch all artists from Dropbox
 */
export async function GET() {
  try {
    const accessToken = await getValidAccessToken()

    // Download artist_urls.json from Dropbox
    const downloadResponse = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path: ARTISTS_FILE_PATH }),
      },
    })

    if (!downloadResponse.ok) {
      if (downloadResponse.status === 409) {
        // File doesn't exist, return empty artists array
        return NextResponse.json({ artists: [] })
      }
      throw new Error(`Failed to download artist_urls.json: ${downloadResponse.status}`)
    }

    const artistsText = await downloadResponse.text()
    const artistsData: ArtistsData = JSON.parse(artistsText)

    return NextResponse.json(artistsData)
  } catch (error) {
    console.error('Error fetching artists:', error)
    return NextResponse.json(
      { error: 'Failed to fetch artists' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/artists - Add a new artist to artist_urls.json
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { artist_name, artist_instagram_username, artist_soundcloud, artist_spotify, artist_beatport } = body

    // Validate required fields
    if (!artist_name || !artist_instagram_username || !artist_soundcloud || !artist_spotify || !artist_beatport) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate that fields are not just whitespace
    if (
      artist_name.trim().length === 0 ||
      artist_instagram_username.trim().length === 0 ||
      artist_soundcloud.trim().length === 0 ||
      artist_spotify.trim().length === 0 ||
      artist_beatport.trim().length === 0
    ) {
      return NextResponse.json(
        { error: 'All fields must contain actual text' },
        { status: 400 }
      )
    }

    const accessToken = await getValidAccessToken()

    // First, get existing artists
    let existingArtists: Artist[] = []
    try {
      const downloadResponse = await fetch('https://content.dropboxapi.com/2/files/download', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Dropbox-API-Arg': JSON.stringify({ path: ARTISTS_FILE_PATH }),
        },
      })

      if (downloadResponse.ok) {
        const artistsText = await downloadResponse.text()
        const artistsData: ArtistsData = JSON.parse(artistsText)
        existingArtists = artistsData.artists || []
      }
    } catch (error) {
      console.log('Artists file does not exist or is empty, starting fresh')
    }

    // Add new artist
    const newArtist: Artist = {
      artist_name: artist_name.trim(),
      artist_instagram_username: artist_instagram_username.trim(),
      artist_soundcloud: artist_soundcloud.trim(),
      artist_spotify: artist_spotify.trim(),
      artist_beatport: artist_beatport.trim(),
    }

    const updatedArtists: ArtistsData = {
      artists: [...existingArtists, newArtist],
    }

    // Upload updated artist_urls.json to Dropbox
    const uploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: ARTISTS_FILE_PATH,
          mode: 'overwrite',
        }),
      },
      body: JSON.stringify(updatedArtists, null, 2),
    })

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload artist_urls.json: ${uploadResponse.status}`)
    }

    return NextResponse.json({ success: true, artist: newArtist })
  } catch (error) {
    console.error('Error adding artist:', error)
    return NextResponse.json(
      { error: 'Failed to add artist' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/artists - Update an existing artist in artist_urls.json
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { index, artist_name, artist_instagram_username, artist_soundcloud, artist_spotify, artist_beatport } = body

    if (index === undefined || index === null) {
      return NextResponse.json(
        { error: 'Index parameter is required' },
        { status: 400 }
      )
    }

    const artistIndex = parseInt(index, 10)
    if (isNaN(artistIndex) || artistIndex < 0) {
      return NextResponse.json(
        { error: 'Invalid index parameter' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!artist_name || !artist_instagram_username || !artist_soundcloud || !artist_spotify || !artist_beatport) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate that fields are not just whitespace
    if (
      artist_name.trim().length === 0 ||
      artist_instagram_username.trim().length === 0 ||
      artist_soundcloud.trim().length === 0 ||
      artist_spotify.trim().length === 0 ||
      artist_beatport.trim().length === 0
    ) {
      return NextResponse.json(
        { error: 'All fields must contain actual text' },
        { status: 400 }
      )
    }

    // Validate SoundCloud URL
    const soundcloudValidation = validateSoundCloudURL(artist_soundcloud)
    if (!soundcloudValidation.valid) {
      return NextResponse.json(
        { error: `SoundCloud URL: ${soundcloudValidation.error}` },
        { status: 400 }
      )
    }

    // Validate Spotify URL
    const spotifyValidation = validateSpotifyURL(artist_spotify)
    if (!spotifyValidation.valid) {
      return NextResponse.json(
        { error: `Spotify URL: ${spotifyValidation.error}` },
        { status: 400 }
      )
    }

    // Validate Beatport URL
    const beatportValidation = validateBeatportURL(artist_beatport)
    if (!beatportValidation.valid) {
      return NextResponse.json(
        { error: `Beatport URL: ${beatportValidation.error}` },
        { status: 400 }
      )
    }

    const accessToken = await getValidAccessToken()

    // Download existing artists
    const downloadResponse = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path: ARTISTS_FILE_PATH }),
      },
    })

    if (!downloadResponse.ok) {
      return NextResponse.json(
        { error: 'Artists file not found' },
        { status: 404 }
      )
    }

    const artistsText = await downloadResponse.text()
    const artistsData: ArtistsData = JSON.parse(artistsText)

    // Validate index
    if (artistIndex >= artistsData.artists.length) {
      return NextResponse.json(
        { error: 'Artist index out of range' },
        { status: 400 }
      )
    }

    // Update artist at index
    const updatedArtist: Artist = {
      artist_name: artist_name.trim(),
      artist_instagram_username: artist_instagram_username.trim(),
      artist_soundcloud: artist_soundcloud.trim(),
      artist_spotify: artist_spotify.trim(),
      artist_beatport: artist_beatport.trim(),
    }

    const updatedArtists: ArtistsData = {
      artists: artistsData.artists.map((artist, i) => 
        i === artistIndex ? updatedArtist : artist
      ),
    }

    // Upload updated artist_urls.json to Dropbox
    const uploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: ARTISTS_FILE_PATH,
          mode: 'overwrite',
        }),
      },
      body: JSON.stringify(updatedArtists, null, 2),
    })

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload artist_urls.json: ${uploadResponse.status}`)
    }

    return NextResponse.json({ success: true, artist: updatedArtist })
  } catch (error) {
    console.error('Error updating artist:', error)
    return NextResponse.json(
      { error: 'Failed to update artist' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/artists - Delete an artist from artist_urls.json
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

    const artistIndex = parseInt(index, 10)
    if (isNaN(artistIndex) || artistIndex < 0) {
      return NextResponse.json(
        { error: 'Invalid index parameter' },
        { status: 400 }
      )
    }

    const accessToken = await getValidAccessToken()

    // Download existing artists
    const downloadResponse = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path: ARTISTS_FILE_PATH }),
      },
    })

    if (!downloadResponse.ok) {
      return NextResponse.json(
        { error: 'Artists file not found' },
        { status: 404 }
      )
    }

    const artistsText = await downloadResponse.text()
    const artistsData: ArtistsData = JSON.parse(artistsText)

    // Validate index
    if (artistIndex >= artistsData.artists.length) {
      return NextResponse.json(
        { error: 'Artist index out of range' },
        { status: 400 }
      )
    }

    // Remove artist at index
    const updatedArtists: ArtistsData = {
      artists: artistsData.artists.filter((_, i) => i !== artistIndex),
    }

    // Upload updated artist_urls.json to Dropbox
    const uploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: ARTISTS_FILE_PATH,
          mode: 'overwrite',
        }),
      },
      body: JSON.stringify(updatedArtists, null, 2),
    })

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload artist_urls.json: ${uploadResponse.status}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting artist:', error)
    return NextResponse.json(
      { error: 'Failed to delete artist' },
      { status: 500 }
    )
  }
}


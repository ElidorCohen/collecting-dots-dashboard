import { NextRequest, NextResponse } from 'next/server'
import { getValidAccessToken, readDropboxJson, writeDropboxJson } from '@/lib/dropbox'
import { normalizeArtist, spotifyArtistId, validateArtist, type Artist } from '@/lib/artist-fields'

const ARTISTS_FILE_PATH = '/artists/artist_urls.json'

interface ArtistsData {
  artists: Artist[]
}

/**
 * Download artist_urls.json; null only when the file does not exist yet
 */
async function readArtists(accessToken: string): Promise<ArtistsData | null> {
  const artistsData = await readDropboxJson<ArtistsData>(accessToken, ARTISTS_FILE_PATH)
  if (artistsData && !Array.isArray(artistsData.artists)) {
    throw new Error('artist_urls.json has no artists list')
  }
  return artistsData
}

const writeArtists = (accessToken: string, artistsData: ArtistsData) => writeDropboxJson(accessToken, ARTISTS_FILE_PATH, artistsData)

/**
 * Normalize and validate a request body; returns the artist and the first error message, if any
 */
function parseArtist(body: Record<string, unknown>): { artist: Artist; error?: string } {
  const artist = normalizeArtist(body)
  const [error] = Object.values(validateArtist(artist))
  return { artist, error }
}

/**
 * The website lists each Spotify artist once, so a second entry would never appear
 */
function duplicateOf(artists: Artist[], artist: Artist, skipIndex = -1) {
  const id = spotifyArtistId(artist.artist_spotify)
  return artists.find((other, i) => i !== skipIndex && spotifyArtistId(other.artist_spotify || '') === id)
}

const reason = (error: unknown) => error instanceof Error ? error.message : String(error)

/**
 * GET /api/artists - Fetch all artists from Dropbox
 */
export async function GET() {
  try {
    const accessToken = await getValidAccessToken()
    const artistsData = await readArtists(accessToken)

    return NextResponse.json(artistsData ?? { artists: [] })
  } catch (error) {
    console.error('Error fetching artists:', error)
    return NextResponse.json(
      { error: `Failed to fetch artists: ${reason(error)}` },
      { status: 500 }
    )
  }
}

/**
 * POST /api/artists - Add a new artist to artist_urls.json
 */
export async function POST(request: NextRequest) {
  try {
    const { artist: newArtist, error } = parseArtist(await request.json())
    if (error) {
      return NextResponse.json(
        { error },
        { status: 400 }
      )
    }

    const accessToken = await getValidAccessToken()

    // A failed read must stop here: writing anyway would replace every artist with this one
    const existingArtists = (await readArtists(accessToken))?.artists ?? []

    const duplicate = duplicateOf(existingArtists, newArtist)
    if (duplicate) {
      return NextResponse.json(
        { error: `This Spotify artist is already listed as "${duplicate.artist_name}"` },
        { status: 400 }
      )
    }

    await writeArtists(accessToken, { artists: [...existingArtists, newArtist] })

    return NextResponse.json({ success: true, artist: newArtist })
  } catch (error) {
    console.error('Error adding artist:', error)
    return NextResponse.json(
      { error: `Failed to add artist: ${reason(error)}` },
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
    const { index } = body

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

    const { artist: updatedArtist, error } = parseArtist(body)
    if (error) {
      return NextResponse.json(
        { error },
        { status: 400 }
      )
    }

    const accessToken = await getValidAccessToken()

    const artistsData = await readArtists(accessToken)
    if (!artistsData) {
      return NextResponse.json(
        { error: 'Artists file not found' },
        { status: 404 }
      )
    }

    // Validate index
    if (artistIndex >= artistsData.artists.length) {
      return NextResponse.json(
        { error: 'Artist index out of range' },
        { status: 400 }
      )
    }

    const duplicate = duplicateOf(artistsData.artists, updatedArtist, artistIndex)
    if (duplicate) {
      return NextResponse.json(
        { error: `This Spotify artist is already listed as "${duplicate.artist_name}"` },
        { status: 400 }
      )
    }

    await writeArtists(accessToken, {
      artists: artistsData.artists.map((artist, i) =>
        i === artistIndex ? updatedArtist : artist
      ),
    })

    return NextResponse.json({ success: true, artist: updatedArtist })
  } catch (error) {
    console.error('Error updating artist:', error)
    return NextResponse.json(
      { error: `Failed to update artist: ${reason(error)}` },
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

    const artistsData = await readArtists(accessToken)
    if (!artistsData) {
      return NextResponse.json(
        { error: 'Artists file not found' },
        { status: 404 }
      )
    }

    // Validate index
    if (artistIndex >= artistsData.artists.length) {
      return NextResponse.json(
        { error: 'Artist index out of range' },
        { status: 400 }
      )
    }

    await writeArtists(accessToken, {
      artists: artistsData.artists.filter((_, i) => i !== artistIndex),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting artist:', error)
    return NextResponse.json(
      { error: `Failed to delete artist: ${reason(error)}` },
      { status: 500 }
    )
  }
}

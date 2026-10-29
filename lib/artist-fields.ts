/**
 * The artist fields the website reads from artist_urls.json, and the rules the form and API share.
 * The website takes each artist's photo from their Spotify profile, so only the name and Spotify are required.
 */

export interface Artist {
  artist_name: string
  artist_instagram_username: string
  artist_soundcloud: string
  artist_spotify: string
  artist_beatport: string
}

export type ArtistErrors = Partial<Record<keyof Artist, string>>

// The website reads the Spotify artist id with this pattern; any other Spotify link breaks the whole roster
const SPOTIFY_ARTIST = /\/artist\/([a-zA-Z0-9]+)/

export const spotifyArtistId = (url: string) => url.match(SPOTIFY_ARTIST)?.[1] ?? null

const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''

// Links are often pasted without the scheme
const withScheme = (url: string) => !url || /^https?:\/\//i.test(url) ? url : `https://${url}`

// Accepts "@name", "name" or a profile link, and keeps only the username
const instagramUsername = (value: string) =>
  (value.match(/instagram\.com\/([^/?#]+)/i)?.[1] ?? value).replace(/^@/, '')

export function normalizeArtist(input: Record<string, unknown>): Artist {
  return {
    artist_name: text(input.artist_name),
    artist_instagram_username: instagramUsername(text(input.artist_instagram_username)),
    artist_soundcloud: withScheme(text(input.artist_soundcloud)),
    artist_spotify: withScheme(text(input.artist_spotify)),
    artist_beatport: withScheme(text(input.artist_beatport)),
  }
}

function linkError(value: string, host: string, label: string): string | undefined {
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return 'URL must start with http:// or https://'
    }
    if (url.hostname !== host && !url.hostname.endsWith(`.${host}`)) {
      return `Must be a ${label} URL (${host})`
    }
  } catch {
    return `Please enter a valid ${label} URL`
  }
}

/** Expects a normalized artist; returns an error per field, empty when it can be saved */
export function validateArtist(artist: Artist): ArtistErrors {
  const errors: ArtistErrors = {}

  if (!artist.artist_name) {
    errors.artist_name = 'Artist name is required'
  }

  if (artist.artist_instagram_username && !/^[A-Za-z0-9._]{1,30}$/.test(artist.artist_instagram_username)) {
    errors.artist_instagram_username = 'Instagram usernames only use letters, numbers, dots and underscores'
  }

  if (!artist.artist_spotify) {
    errors.artist_spotify = 'Spotify URL is required (the website uses it for the artist photo)'
  } else {
    errors.artist_spotify = linkError(artist.artist_spotify, 'spotify.com', 'Spotify')
      ?? (spotifyArtistId(artist.artist_spotify) ? undefined : 'Use the artist profile link (open.spotify.com/artist/...), not a track or playlist')
  }

  if (artist.artist_soundcloud) {
    errors.artist_soundcloud = linkError(artist.artist_soundcloud, 'soundcloud.com', 'SoundCloud')
  }

  if (artist.artist_beatport) {
    errors.artist_beatport = linkError(artist.artist_beatport, 'beatport.com', 'Beatport')
  }

  return Object.fromEntries(Object.entries(errors).filter(([, error]) => error)) as ArtistErrors
}

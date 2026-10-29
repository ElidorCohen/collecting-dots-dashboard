import { Dropbox } from 'dropbox'
import { redis, CACHE_KEYS, CACHE_TTL } from './redis'

interface DropboxTokenCache {
  accessToken: string
  expiryTime: number
}

/**
 * Get a valid Dropbox access token (refresh if needed)
 * Uses Redis cache to persist tokens across serverless invocations
 */
export async function getValidAccessToken(): Promise<string> {
  // Try to get cached token from Redis; the cache is a shortcut, so an unreachable Redis only costs a refresh
  try {
    const cachedToken = await redis.get<DropboxTokenCache>(CACHE_KEYS.DROPBOX_TOKEN)

    if (cachedToken && Date.now() < cachedToken.expiryTime) {
      return cachedToken.accessToken
    }
  } catch (error) {
    console.error('❌ Failed to read cached Dropbox token:', error)
  }

  // Refresh the token using the refresh token
  const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.DROPBOX_REFRESH_TOKEN!,
      client_id: process.env.DROPBOX_APP_KEY!,
      client_secret: process.env.DROPBOX_APP_SECRET!,
    }),
  })

  // Access tokens expire after four hours, so there is no older token worth falling back to
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    console.error('❌ Failed to refresh Dropbox token:', response.status, data)
    throw new Error(`Dropbox sign-in failed (${response.status}${data.error_description ? `: ${data.error_description}` : data.error ? `: ${data.error}` : ''})`)
  }

  const data = await response.json()
  const newToken: DropboxTokenCache = {
    accessToken: data.access_token,
    expiryTime: Date.now() + (3.5 * 60 * 60 * 1000) // 3.5 hours
  }

  // Cache the new token in Redis with TTL
  try {
    await redis.set(CACHE_KEYS.DROPBOX_TOKEN, newToken, { ex: CACHE_TTL.DROPBOX_TOKEN })
  } catch (error) {
    console.error('❌ Failed to cache Dropbox token:', error)
  }

  return newToken.accessToken
}

/**
 * Turn a failed Dropbox response into an error that says what Dropbox said
 */
async function dropboxError(response: Response, action: string): Promise<Error> {
  const body = await response.text().catch(() => '')
  let summary = body.slice(0, 200)
  try {
    summary = JSON.parse(body).error_summary || summary
  } catch {}
  return new Error(`Dropbox ${action} failed (${response.status}${summary ? `: ${summary}` : ''})`)
}

/**
 * Download and parse a JSON file; null only when the file does not exist yet.
 * Any other failure throws, so a caller never mistakes it for an empty file and overwrites it.
 */
export async function readDropboxJson<T>(accessToken: string, path: string): Promise<T | null> {
  const response = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Dropbox-API-Arg': JSON.stringify({ path }),
    },
  })

  if (!response.ok) {
    const error = await dropboxError(response, 'download')
    // 409 covers several errors; only a missing file means "nothing yet"
    if (response.status === 409 && error.message.includes('not_found')) {
      return null
    }
    throw error
  }

  return JSON.parse(await response.text()) as T
}

/**
 * Upload a JSON file, replacing the previous version
 */
export async function writeDropboxJson(accessToken: string, path: string, data: unknown) {
  const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({
        path,
        mode: 'overwrite',
      }),
    },
    body: JSON.stringify(data, null, 2),
  })

  if (!response.ok) {
    throw await dropboxError(response, 'upload')
  }
}

/**
 * Get a configured Dropbox client instance
 */
export async function getDropboxClient(): Promise<Dropbox> {
  const accessToken = await getValidAccessToken()
  return new Dropbox({
    accessToken,
    fetch: fetch,
  })
}

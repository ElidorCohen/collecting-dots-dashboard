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
  // Try to get cached token from Redis
  const cachedToken = await redis.get<DropboxTokenCache>(CACHE_KEYS.DROPBOX_TOKEN)

  if (cachedToken && Date.now() < cachedToken.expiryTime) {
    return cachedToken.accessToken
  }

  // Refresh the token using the refresh token
  try {
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

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.status}`)
    }

    const data = await response.json()
    const newToken: DropboxTokenCache = {
      accessToken: data.access_token,
      expiryTime: Date.now() + (3.5 * 60 * 60 * 1000) // 3.5 hours
    }

    // Cache the new token in Redis with TTL
    await redis.set(CACHE_KEYS.DROPBOX_TOKEN, newToken, { ex: CACHE_TTL.DROPBOX_TOKEN })

    return newToken.accessToken
  } catch (error) {
    console.error('❌ Failed to refresh Dropbox token:', error)
    // Fallback to env token if refresh fails
    return process.env.DROPBOX_ACCESS_TOKEN!
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

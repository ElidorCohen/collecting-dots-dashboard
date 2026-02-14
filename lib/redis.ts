import { Redis } from '@upstash/redis'

let redisClient: Redis | null = null

/**
 * Get Redis client instance (lazy initialization)
 * Configured with REST API for serverless compatibility
 */
function getRedisClient(): Redis {
  if (!redisClient) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set')
    }

    redisClient = new Redis({
      url,
      token,
    })
  }
  return redisClient
}

export const redis = {
  get: <T = any>(key: string) => getRedisClient().get<T>(key),
  set: (key: string, value: any, opts?: { ex?: number }) => {
    if (opts?.ex) {
      return getRedisClient().set(key, value, { ex: opts.ex })
    }
    return getRedisClient().set(key, value)
  },
  del: (key: string) => getRedisClient().del(key),
}

/**
 * Cache keys used throughout the application
 */
export const CACHE_KEYS = {
  DEMOS: 'demos:cache',
  DROPBOX_TOKEN: 'dropbox:access_token',
  SETTINGS_DEMO_SUBMISSION_ENABLED: 'settings:demo_submission_enabled',
} as const

/**
 * Cache TTL durations in seconds
 */
export const CACHE_TTL = {
  DEMOS: 15 * 60, // 15 minutes
  DROPBOX_TOKEN: 3.5 * 60 * 60, // 3.5 hours
} as const

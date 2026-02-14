import { CACHE_KEYS, redis } from '@/lib/redis'

const DEFAULT_DEMO_SUBMISSION_ENABLED = true

export async function getDemoSubmissionEnabled(): Promise<boolean> {
  const enabled = await redis.get<boolean | null>(CACHE_KEYS.SETTINGS_DEMO_SUBMISSION_ENABLED)

  if (typeof enabled === 'boolean') {
    return enabled
  }

  return DEFAULT_DEMO_SUBMISSION_ENABLED
}

export async function setDemoSubmissionEnabled(enabled: boolean): Promise<boolean> {
  await redis.set(CACHE_KEYS.SETTINGS_DEMO_SUBMISSION_ENABLED, enabled)
  return enabled
}

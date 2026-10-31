import { NextResponse } from 'next/server'
import { getSpaceUsage, getValidAccessToken } from '@/lib/dropbox'

/**
 * GET /api/dropbox-usage - How much of the Dropbox storage is used, in bytes
 */
export async function GET() {
  try {
    const accessToken = await getValidAccessToken()
    const usage = await getSpaceUsage(accessToken)

    // The layout mounts with every page; a few minutes old is fine for a storage gauge
    return NextResponse.json(usage, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    })
  } catch (error) {
    console.error('Error fetching Dropbox usage:', error)
    const reason = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: reason.includes('missing_scope') ? 'Dropbox needs the account_info.read permission' : 'Could not read Dropbox storage' },
      { status: 500 }
    )
  }
}

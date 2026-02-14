import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  getDemoSubmissionEnabled,
  setDemoSubmissionEnabled,
} from '@/lib/services/settings-service'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const enabled = await getDemoSubmissionEnabled()
    return NextResponse.json({ enabled })
  } catch (error) {
    console.error('Error fetching demo submission setting:', error)
    return NextResponse.json({ error: 'Failed to fetch setting' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    if (typeof body?.enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid payload. "enabled" must be a boolean.' },
        { status: 400 }
      )
    }

    const enabled = await setDemoSubmissionEnabled(body.enabled)
    return NextResponse.json({ enabled })
  } catch (error) {
    console.error('Error updating demo submission setting:', error)
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
  }
}

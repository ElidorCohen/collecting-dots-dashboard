import { currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/validate-email
 * Check if the current user is authenticated
 * Any authenticated Clerk user is authorized to access the dashboard
 */
export async function GET() {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ authorized: false, reason: 'Not authenticated' }, { status: 401 })
    }

    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase()
    
    // Any authenticated user is authorized
    return NextResponse.json({
      authorized: true,
      email: userEmail,
      reason: 'Authenticated user'
    })
    
  } catch (error) {
    return NextResponse.json({ authorized: false, reason: 'Validation error' }, { status: 500 })
  }
}
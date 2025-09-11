import { currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json({ authorized: false, reason: 'Not authenticated' }, { status: 401 })
    }

    const userEmail = user.emailAddresses[0]?.emailAddress?.toLowerCase()
    const allowedEmails = process.env.ALLOWED_EMAILS?.split(',').map(email => email.trim().toLowerCase()) || []
    
    const isAuthorized = userEmail && allowedEmails.includes(userEmail)
    
    return NextResponse.json({
      authorized: isAuthorized,
      reason: isAuthorized ? 'Email authorized' : 'Email not in whitelist'
    })
    
  } catch (error) {
    return NextResponse.json({ authorized: false, reason: 'Validation error' }, { status: 500 })
  }
}
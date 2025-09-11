import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/demos(.*)'
])

// Get allowed emails from environment variable
const getAllowedEmails = () => {
  const emails = process.env.ALLOWED_EMAILS?.split(',').map(email => email.trim().toLowerCase()) || [];
  return emails;
};

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  
  // Allow public routes
  if (!isProtectedRoute(req)) {
    return NextResponse.next();
  }
  
  // If it's a protected route and user is not signed in, redirect to sign-in
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // If user is signed in, check if their email is whitelisted
  if (userId && sessionClaims) {
    // Try to get email from different possible locations in sessionClaims
    const userEmail = (
      sessionClaims.email || 
      sessionClaims.primaryEmailAddress?.emailAddress ||
      sessionClaims.emailAddresses?.[0]?.emailAddress
    ) as string;
    
    const allowedEmails = getAllowedEmails();
    
    if (userEmail && allowedEmails.length > 0) {
      const isEmailAllowed = allowedEmails.includes(userEmail.toLowerCase());
      
      if (!isEmailAllowed) {
        // User email is not whitelisted, redirect to unauthorized page
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
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

// Get owner emails from environment variable
const getOwnerEmails = () => {
  const emails = process.env.LABEL_OWNER_EMAIL?.split(',').map(email => email.trim().toLowerCase()) || [];
  return emails;
};

// Get assistant emails from environment variable
const getAssistantEmails = () => {
  const emails = process.env.ASSISTANT_EMAIL?.split(',').map(email => email.trim().toLowerCase()) || [];
  return emails;
};

// Determine user role based on email
const getUserRole = (email: string): 'admin' | 'assistant' => {
  const normalizedEmail = email.toLowerCase();
  const ownerEmails = getOwnerEmails();

  // Check if email is in owner list
  if (ownerEmails.includes(normalizedEmail)) {
    return 'admin';
  }

  // Default to assistant (they still need to be in ALLOWED_EMAILS to access)
  return 'assistant';
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

  // If user is signed in, check if their email is whitelisted and determine role
  if (userId && sessionClaims) {
    // Try to get email from different possible locations in sessionClaims
    const userEmail = (
      (sessionClaims as any).email || 
      (sessionClaims as any).primaryEmailAddress?.emailAddress ||
      (sessionClaims as any).emailAddresses?.[0]?.emailAddress
    ) as string;
    
    const allowedEmails = getAllowedEmails();
    
    if (userEmail && allowedEmails.length > 0) {
      const isEmailAllowed = allowedEmails.includes(userEmail.toLowerCase());
      
      if (!isEmailAllowed) {
        // User email is not whitelisted, redirect to unauthorized page
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
      
      // Determine user role and add to headers for downstream use
      const userRole = getUserRole(userEmail);
      const response = NextResponse.next();
      response.headers.set('x-user-role', userRole);
      response.headers.set('x-user-email', userEmail.toLowerCase());
      
      return response;
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



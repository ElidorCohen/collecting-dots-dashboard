import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/demos(.*)',
  '/api/artists(.*)',
  '/api/events(.*)',
  '/api/dropbox-usage(.*)',
  '/api/merch(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Allow public routes
  if (!isProtectedRoute(req)) {
    return NextResponse.next();
  }

  // If it's a protected route and user is not signed in, redirect to sign-in
  if (!userId) {
    // A redirected fetch would read the sign-in page as a success, so API calls get a plain 401
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // User is authenticated - allow access
  // Role is managed client-side via the role switcher
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



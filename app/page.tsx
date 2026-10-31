import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'

export const metadata: Metadata = {
  title: 'Demo Submission Dashboard - Home',
  description: 'Manage music demo submissions with role-based access control',
}

export default async function HomePage() {
  const user = await currentUser()

  // If user is authenticated, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  // If not authenticated, show sign-in page
  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col justify-center items-center min-h-screen px-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h1 className="mb-4 font-display text-4xl text-foreground">
              Demo Dashboard
            </h1>
            <p className="mb-8 text-lg text-muted-foreground">
              Professional music demo submission management system
            </p>
          </div>
          
          <div className="space-y-4">
            <a
              href="/sign-in"
              className="flex w-full justify-center rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Sign In with Google
            </a>
            
            <p className="text-xs text-muted-foreground">
              Access restricted to authorized users only
            </p>
          </div>
          
          <div className="mt-8 text-center">
            <div className="grid grid-cols-1 gap-4 text-sm text-muted-foreground">
              <div className="rounded-2xl border bg-card p-4">
                <h3 className="mb-2 font-medium text-foreground">Features</h3>
                <ul className="space-y-1 text-left">
                  <li>• Role-based access control</li>
                  <li>• Demo submission tracking</li>
                  <li>• Status management workflow</li>
                  <li>• Secure authentication</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

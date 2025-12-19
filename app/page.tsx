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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="flex flex-col justify-center items-center min-h-screen px-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Demo Dashboard
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Professional music demo submission management system
            </p>
          </div>
          
          <div className="space-y-4">
            <a
              href="/sign-in"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Sign In with Google
            </a>
            
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Access restricted to authorized users only
            </p>
          </div>
          
          <div className="mt-8 text-center">
            <div className="grid grid-cols-1 gap-4 text-sm text-gray-600 dark:text-gray-300">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Features</h3>
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

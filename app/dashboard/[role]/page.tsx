import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { SignOutButton, UserButton } from '@clerk/nextjs'
import DemoDashboard from '../../components/demo-dashboard'

type Props = {
  params: { role: string }
  searchParams: { status?: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const role = params.role === 'admin' ? 'Admin' : params.role === 'assistant' ? 'Assistant' : 'Unknown'
  
  return {
    title: `Demo Dashboard - ${role}`,
    description: `Demo submission dashboard for ${role.toLowerCase()}`,
  }
}

export async function generateStaticParams() {
  return [
    { role: 'admin' },
    { role: 'assistant' },
  ]
}

// Determine user role based on email
const getUserRole = (email: string): 'admin' | 'assistant' => {
  if (email.toLowerCase() === 'elidor05@gmail.com') {
    return 'admin';
  }
  return 'assistant';
};

async function getDashboardData(role: string, status: string = 'all') {
  // Return initial data directly - the client-side component will handle API calls
  return {
    demos: [],
    counts: {
      submitted: 2,
      liked: 2,
      rejected_by_assistant: 1,
      approved: 1,
      rejected_by_admin: 1,
    }
  }
}

export default async function RoleDashboardPage({ params, searchParams }: Props) {
  // TEMPORARILY COMMENTED OUT FOR TESTING - UNCOMMENT TO RE-ENABLE CLERK AUTH
  /* CLERK AUTH CODE - UNCOMMENT TO RE-ENABLE
  const user = await currentUser()
  
  if (!user) {
    notFound()
  }

  // Validate that the role parameter is correct
  if (!['admin', 'assistant'].includes(params.role)) {
    notFound()
  }

  // Verify that the user is accessing the correct role dashboard
  const userEmail = user.emailAddresses[0]?.emailAddress;
  if (userEmail) {
    const userRole = getUserRole(userEmail);
    // If user is trying to access a different role dashboard, redirect them
    if (params.role !== userRole) {
      notFound()
    }
  }
  */

  const initialData = await getDashboardData(params.role, searchParams.status)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with user info */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Demo Dashboard - {params.role === 'admin' ? 'Admin Panel' : 'Assistant Panel'}
              </h1>
              <p className="text-sm text-gray-600">
                Welcome, Test User {/* TEMPORARY: {user.firstName || user.emailAddresses[0]?.emailAddress} */}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* TEMPORARILY COMMENTED OUT FOR TESTING */}
              {/* <UserButton afterSignOutUrl="/" /> */}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DemoDashboard 
          role={params.role} 
          initialData={initialData}
          status={searchParams.status || 'all'}
        />
      </main>
    </div>
  )
}

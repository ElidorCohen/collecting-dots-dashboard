import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { SignOutButton, UserButton } from '@clerk/nextjs'
import DemoDashboard from '../../components/demo-dashboard'
import EmailValidationCheck from '../../components/email-validation'

type Props = {
  params: { role: string }
  searchParams: { status?: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const role = params.role === 'aviram' ? 'Assistant' : params.role === 'omri' ? 'Owner' : 'Unknown'
  
  return {
    title: `Demo Dashboard - ${role}`,
    description: `Demo submission dashboard for ${role.toLowerCase()}`,
  }
}

export async function generateStaticParams() {
  return [
    { role: 'aviram' },
    { role: 'omri' },
  ]
}

async function getDashboardData(role: string, status: string = 'all') {
  // Return initial data directly - the client-side component will handle API calls
  return {
    demos: [],
    counts: {
      submitted: 2,
      liked: 2,
      rejected_by_aviram: 1,
      approved: 1,
      rejected_by_omri: 1,
    }
  }
}

export default async function RoleDashboardPage({ params, searchParams }: Props) {
  const user = await currentUser()
  
  if (!user) {
    notFound()
  }

  if (!['aviram', 'omri'].includes(params.role)) {
    notFound()
  }

  const initialData = await getDashboardData(params.role, searchParams.status)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with user info */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Demo Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Welcome, {user.firstName || user.emailAddresses[0]?.emailAddress}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <UserButton afterSignOutUrl="/" />
              <SignOutButton>
                <button className="text-sm text-gray-600 hover:text-gray-900">
                  Sign Out
                </button>
              </SignOutButton>
            </div>
          </div>
        </div>
      </header>
      
      {/* Dashboard content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Email validation check */}
        <EmailValidationCheck />
        
        <DemoDashboard initialData={initialData} />
      </main>
    </div>
  )
}

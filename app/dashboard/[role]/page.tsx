import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import DemoDashboard from '../../components/demo-dashboard'

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
  if (!['aviram', 'omri'].includes(params.role)) {
    notFound()
  }

  const initialData = await getDashboardData(params.role, searchParams.status)

  return <DemoDashboard initialData={initialData} />
}

import { redirect } from 'next/navigation'

type Props = {
  params: { role: string }
  searchParams: { status?: string }
}

// Redirect legacy role-based URLs to the new dashboard
// The role is now managed via context and the role switcher component
export default async function RoleDashboardPage({ params, searchParams }: Props) {
  // Build the redirect URL with any existing query params
  const queryString = searchParams.status ? `?status=${searchParams.status}` : ''
  redirect(`/dashboard${queryString}`)
}

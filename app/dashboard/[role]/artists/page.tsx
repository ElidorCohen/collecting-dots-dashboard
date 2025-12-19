import { redirect } from 'next/navigation'

// Redirect legacy role-based URLs to the new dashboard
export default async function ArtistsPage({ params }: { params: { role: string } }) {
  redirect('/dashboard/artists')
}

import { Metadata } from 'next'
import DemoDashboard from './components/demo-dashboard'

export const metadata: Metadata = {
  title: 'Demo Submission Dashboard - Home',
  description: 'Manage music demo submissions with role-based access control',
}

async function getDashboardData() {
  // Return initial data directly instead of making an API call
  // This avoids the need for NEXT_PUBLIC_BASE_URL during build time
  return {
    demos: [
      {
        id: "1",
        trackTitle: "Midnight Dreams",
        artistName: "Luna Rodriguez",
        listenLink: "https://dl.dropboxusercontent.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t",
        submissionDate: "2024-01-15",
        status: "submitted" as const,
      },
      {
        id: "2",
        trackTitle: "Electric Pulse",
        artistName: "DJ Neon",
        listenLink: "https://dl.dropboxusercontent.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t",
        submissionDate: "2024-01-14",
        status: "submitted" as const,
      },
      {
        id: "3",
        trackTitle: "Ocean Waves",
        artistName: "Coastal Sounds",
        listenLink: "https://dl.dropboxusercontent.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t",
        submissionDate: "2024-01-13",
        status: "liked" as const,
      },
      {
        id: "4",
        trackTitle: "Urban Rhythm",
        artistName: "Street Beats",
        listenLink: "https://dl.dropboxusercontent.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t",
        submissionDate: "2024-01-12",
        status: "liked" as const,
      },
      {
        id: "5",
        trackTitle: "Sunset Melody",
        artistName: "Golden Hour",
        listenLink: "https://dl.dropboxusercontent.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t",
        submissionDate: "2024-01-11",
        status: "approved" as const,
      },
      {
        id: "6",
        trackTitle: "Bass Drop",
        artistName: "Heavy Sounds",
        listenLink: "https://dl.dropboxusercontent.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t",
        submissionDate: "2024-01-10",
        status: "rejected_by_aviram" as const,
      },
      {
        id: "7",
        trackTitle: "Chill Vibes",
        artistName: "Relaxed Tunes",
        listenLink: "https://dl.dropboxusercontent.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t",
        submissionDate: "2024-01-09",
        status: "rejected_by_omri" as const,
      },
    ],
    counts: {
      submitted: 2,
      liked: 2,
      rejected_by_aviram: 1,
      approved: 1,
      rejected_by_omri: 1,
    }
  }
}

export default async function HomePage() {
  const initialData = await getDashboardData()

  return <DemoDashboard initialData={initialData} />
}

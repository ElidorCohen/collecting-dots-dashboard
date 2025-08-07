import { NextRequest, NextResponse } from 'next/server'

export type DemoStatus = "submitted" | "liked" | "rejected_by_aviram" | "approved" | "rejected_by_omri"

export interface Demo {
  id: string
  trackTitle: string
  artistName: string
  listenLink: string
  submissionDate: string
  status: DemoStatus
}

// In a real application, this would be stored in a database
let demos: Demo[] = [
  {
    id: "1",
    trackTitle: "Midnight Dreams",
    artistName: "Luna Rodriguez",
    listenLink: "https://dl.dropboxusercontent.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t",
    submissionDate: "2024-01-15",
    status: "submitted",
  },
  {
    id: "2",
    trackTitle: "Electric Pulse",
    artistName: "DJ Neon",
    listenLink: "https://dl.dropboxusercontent.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t",
    submissionDate: "2024-01-14",
    status: "submitted",
  },
  {
    id: "3",
    trackTitle: "Ocean Waves",
    artistName: "Coastal Sounds",
    listenLink: "https://dl.dropboxusercontent.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t",
    submissionDate: "2024-01-13",
    status: "liked",
  },
  {
    id: "4",
    trackTitle: "Urban Rhythm",
    artistName: "Street Beats",
    listenLink: "https://dl.dropboxusercontent.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t",
    submissionDate: "2024-01-12",
    status: "liked",
  },
  {
    id: "5",
    trackTitle: "Sunset Melody",
    artistName: "Golden Hour",
    listenLink: "https://dl.dropboxusercontent.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t",
    submissionDate: "2024-01-11",
    status: "approved",
  },
  {
    id: "6",
    trackTitle: "Bass Drop",
    artistName: "Heavy Sounds",
    listenLink: "https://dl.dropboxusercontent.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t",
    submissionDate: "2024-01-10",
    status: "rejected_by_aviram",
  },
  {
    id: "7",
    trackTitle: "Chill Vibes",
    artistName: "Relaxed Tunes",
    listenLink: "https://dl.dropboxusercontent.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t",
    submissionDate: "2024-01-09",
    status: "rejected_by_omri",
  },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')
  const status = searchParams.get('status')

  let filteredDemos = [...demos]

  // Role-based filtering
  if (role === 'aviram') {
    filteredDemos = demos.filter((demo) => demo.status === "submitted")
  } else if (role === 'omri') {
    filteredDemos = demos.filter((demo) => demo.status === "liked")
  }

  // Status filtering
  if (status && status !== 'all') {
    filteredDemos = filteredDemos.filter((demo) => demo.status === status)
  }

  return NextResponse.json({
    demos: filteredDemos,
    counts: {
      submitted: demos.filter((d) => d.status === "submitted").length,
      liked: demos.filter((d) => d.status === "liked").length,
      rejected_by_aviram: demos.filter((d) => d.status === "rejected_by_aviram").length,
      approved: demos.filter((d) => d.status === "approved").length,
      rejected_by_omri: demos.filter((d) => d.status === "rejected_by_omri").length,
    }
  })
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, status } = await request.json()

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Demo ID and status are required' },
        { status: 400 }
      )
    }

    const demoIndex = demos.findIndex(demo => demo.id === id)
    
    if (demoIndex === -1) {
      return NextResponse.json(
        { error: 'Demo not found' },
        { status: 404 }
      )
    }

    demos[demoIndex].status = status

    return NextResponse.json({
      success: true,
      demo: demos[demoIndex]
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

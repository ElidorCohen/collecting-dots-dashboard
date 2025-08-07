"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, ExternalLink, Music, ThumbsDown, ThumbsUp, User, CheckCircle, XCircle } from "lucide-react"
// import { AudioPlayer } from "./components/audio-player"

type DemoStatus = "submitted" | "liked" | "rejected_by_aviram" | "approved" | "rejected_by_omri"
type UserRole = "aviram" | "omri"

interface Demo {
  id: string
  trackTitle: string
  artistName: string
  listenLink: string
  submissionDate: string
  status: DemoStatus
}

const initialDemos: Demo[] = [
  {
    id: "1",
    trackTitle: "Midnight Dreams",
    artistName: "Luna Rodriguez",
    listenLink:
      "https://www.dropbox.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t&e=1&st=l2io7j3a&dl=0",
    submissionDate: "2024-01-15",
    status: "submitted",
  },
  {
    id: "2",
    trackTitle: "Electric Pulse",
    artistName: "DJ Neon",
    listenLink:
      "https://www.dropbox.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t&e=1&st=l2io7j3a&dl=0",
    submissionDate: "2024-01-14",
    status: "submitted",
  },
  {
    id: "3",
    trackTitle: "Ocean Waves",
    artistName: "Coastal Sounds",
    listenLink:
      "https://www.dropbox.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t&e=1&st=l2io7j3a&dl=0",
    submissionDate: "2024-01-13",
    status: "liked",
  },
  {
    id: "4",
    trackTitle: "Urban Rhythm",
    artistName: "Street Beats",
    listenLink:
      "https://www.dropbox.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t&e=1&st=l2io7j3a&dl=0",
    submissionDate: "2024-01-12",
    status: "liked",
  },
  {
    id: "5",
    trackTitle: "Sunset Melody",
    artistName: "Golden Hour",
    listenLink:
      "https://www.dropbox.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t&e=1&st=l2io7j3a&dl=0",
    submissionDate: "2024-01-11",
    status: "approved",
  },
  {
    id: "6",
    trackTitle: "Bass Drop",
    artistName: "Heavy Sounds",
    listenLink:
      "https://www.dropbox.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t&e=1&st=l2io7j3a&dl=0",
    submissionDate: "2024-01-10",
    status: "rejected_by_aviram",
  },
  {
    id: "7",
    trackTitle: "Chill Vibes",
    artistName: "Relaxed Tunes",
    listenLink:
      "https://www.dropbox.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t&e=1&st=l2io7j3a&dl=0",
    submissionDate: "2024-01-09",
    status: "rejected_by_omri",
  },
]

const statusConfig = {
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-800", icon: Music },
  liked: { label: "Liked by Aviram", color: "bg-green-100 text-green-800", icon: ThumbsUp },
  rejected_by_aviram: { label: "Rejected by Aviram", color: "bg-red-100 text-red-800", icon: ThumbsDown },
  approved: { label: "Approved by Omri", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  rejected_by_omri: { label: "Rejected by Omri", color: "bg-red-100 text-red-800", icon: XCircle },
}

export default function DemoDashboard() {
  const [demos, setDemos] = useState<Demo[]>(initialDemos)
  const [currentUser, setCurrentUser] = useState<UserRole>("aviram")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const updateDemoStatus = (demoId: string, newStatus: DemoStatus) => {
    setDemos((prev) => prev.map((demo) => (demo.id === demoId ? { ...demo, status: newStatus } : demo)))
  }

  const filteredDemos = useMemo(() => {
    let filtered = demos

    // Role-based filtering
    if (currentUser === "aviram") {
      filtered = demos.filter((demo) => demo.status === "submitted")
    } else if (currentUser === "omri") {
      filtered = demos.filter((demo) => demo.status === "liked")
    }

    // Status filtering
    if (statusFilter !== "all") {
      filtered = filtered.filter((demo) => demo.status === statusFilter)
    }

    return filtered
  }, [demos, currentUser, statusFilter])

  const getStatusCounts = () => {
    const counts = {
      submitted: demos.filter((d) => d.status === "submitted").length,
      liked: demos.filter((d) => d.status === "liked").length,
      rejected_by_aviram: demos.filter((d) => d.status === "rejected_by_aviram").length,
      approved: demos.filter((d) => d.status === "approved").length,
      rejected_by_omri: demos.filter((d) => d.status === "rejected_by_omri").length,
    }
    return counts
  }

  const statusCounts = getStatusCounts()

  const StatusBadge = ({ status }: { status: DemoStatus }) => {
    const config = statusConfig[status]
    const Icon = config.icon
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  const DemoCard = ({ demo }: { demo: Demo }) => (
    <Card className="mb-4">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{demo.trackTitle}</h3>
            <p className="text-gray-600 mb-2">{demo.artistName}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <CalendarDays className="w-4 h-4" />
                {new Date(demo.submissionDate).toLocaleDateString()}
              </div>
              <a
                href={demo.listenLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="w-4 h-4" />
                Listen
              </a>
            </div>
          </div>
          <StatusBadge status={demo.status} />
        </div>

        <div className="flex gap-2 mb-4">
          {currentUser === "aviram" && demo.status === "submitted" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-600 hover:bg-green-50 bg-transparent"
                onClick={() => updateDemoStatus(demo.id, "liked")}
              >
                <ThumbsUp className="w-4 h-4 mr-1" />
                Like
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50 bg-transparent"
                onClick={() => updateDemoStatus(demo.id, "rejected_by_aviram")}
              >
                <ThumbsDown className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </>
          )}

          {currentUser === "omri" && demo.status === "liked" && (
            <>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => updateDemoStatus(demo.id, "approved")}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50 bg-transparent"
                onClick={() => updateDemoStatus(demo.id, "rejected_by_omri")}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject
              </Button>
            </>
          )}
        </div>

        {/* HTML5 Audio Player - positioned below action buttons */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <audio
            controls
            className="w-full h-10"
            preload="metadata"
            style={{
              borderRadius: "6px",
              outline: "none",
            }}
            onError={(e) => {
              console.log("Audio loading error:", e)
              // Don't show error to user for HTML5 audio - browser handles it
            }}
          >
            <source
              src="https://dl.dropboxusercontent.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t"
              type="audio/wav"
            />
            <source
              src="https://dl.dropboxusercontent.com/scl/fi/umf1stfz6i65yj2ek4s0w/anymore.wav?rlkey=3r7cy343pt1q4ow6bviow8s9t"
              type="audio/mpeg"
            />
            Your browser does not support the audio element.
          </audio>
          <div className="text-xs text-gray-500 mt-2 text-center">
            {demo.trackTitle} by {demo.artistName}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Demo Submission Dashboard</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="text-sm text-gray-600">Logged in as:</span>
              </div>
              <Tabs value={currentUser} onValueChange={(value) => setCurrentUser(value as UserRole)}>
                <TabsList>
                  <TabsTrigger value="aviram">Aviram (Assistant)</TabsTrigger>
                  <TabsTrigger value="omri">Omri (Owner)</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Submitted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{statusCounts.submitted}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Liked</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{statusCounts.liked}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{statusCounts.approved}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Rejected (Aviram)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{statusCounts.rejected_by_aviram}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Rejected (Omri)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{statusCounts.rejected_by_omri}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Filter by status:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="liked">Liked by Aviram</SelectItem>
                <SelectItem value="rejected_by_aviram">Rejected by Aviram</SelectItem>
                <SelectItem value="approved">Approved by Omri</SelectItem>
                <SelectItem value="rejected_by_omri">Rejected by Omri</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Demo List */}
        <div className="space-y-4">
          {filteredDemos.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No demos found</h3>
                <p className="text-gray-600">
                  {currentUser === "aviram"
                    ? "No submitted demos to review at the moment."
                    : "No demos liked by Aviram to review at the moment."}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredDemos.map((demo) => <DemoCard key={demo.id} demo={demo} />)
          )}
        </div>
      </div>
    </div>
  )
}

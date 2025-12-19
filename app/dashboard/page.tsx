"use client"

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import DemoDashboard from '../components/demo-dashboard'
import { DashboardLayout } from '../components/dashboard-layout'

function DashboardContent() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status') || 'all'

  return (
    <DashboardLayout>
      <DemoDashboard status={status} />
    </DashboardLayout>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}


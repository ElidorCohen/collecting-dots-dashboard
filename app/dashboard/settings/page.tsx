"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "../../components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

const UNAVAILABLE_MESSAGE = "We're currently under high load and will be accepting demos again soon."

export default function SettingsPage() {
  const [enabled, setEnabled] = useState<boolean>(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSetting = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch("/api/settings/demo-submission-enabled")
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load settings")
        }

        setEnabled(Boolean(data.enabled))
      } catch (fetchError) {
        console.error("Error fetching demo submission setting:", fetchError)
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load settings")
      } finally {
        setIsLoading(false)
      }
    }

    fetchSetting()
  }, [])

  const handleToggle = async () => {
    const nextValue = !enabled
    try {
      setIsSaving(true)
      setError(null)

      const response = await fetch("/api/settings/demo-submission-enabled", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextValue }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update setting")
      }

      setEnabled(Boolean(data.enabled))
    } catch (updateError) {
      console.error("Error updating demo submission setting:", updateError)
      setError(updateError instanceof Error ? updateError.message : "Failed to update setting")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure dashboard and site behavior</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Demo Submission Availability</CardTitle>
            <CardDescription>
              Control whether visitors can submit demos from the website.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading current setting...
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-foreground">
                      Demo submissions are currently {enabled ? "enabled" : "disabled"}.
                    </p>
                    {!enabled && (
                      <p className="text-sm text-muted-foreground mt-1">{UNAVAILABLE_MESSAGE}</p>
                    )}
                  </div>
                  <Button onClick={handleToggle} disabled={isSaving} variant={enabled ? "destructive" : "default"}>
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : enabled ? (
                      "Disable"
                    ) : (
                      "Enable"
                    )}
                  </Button>
                </div>

                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

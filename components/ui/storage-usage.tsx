"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface Usage {
  used: number
  allocated: number
}

// Dropbox plans are sold in binary units: "2 GB" is 2 × 1024³ bytes
function formatBytes(bytes: number) {
  const gigabytes = bytes / 1024 ** 3
  if (gigabytes >= 1024) return `${Number((gigabytes / 1024).toFixed(2))} TB`
  if (gigabytes >= 1) return `${Number(gigabytes.toFixed(2))} GB`
  return `${Number((bytes / 1024 ** 2).toFixed(2))} MB`
}

export function StorageUsage({ collapsed = false }: { collapsed?: boolean }) {
  const [usage, setUsage] = React.useState<Usage | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const controller = new AbortController()
    fetch("/api/dropbox-usage", { signal: controller.signal })
      .then(async response => {
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.allocated) throw new Error(data?.error || "Could not read Dropbox storage")
        setUsage(data)
      })
      .catch(reason => {
        if (!controller.signal.aborted) setError(reason.message)
      })
    return () => controller.abort()
  }, [])

  if (error) {
    return collapsed ? null : <p className="text-xs text-muted-foreground">{error}</p>
  }
  if (!usage) return null

  const percent = Math.min(100, usage.used / usage.allocated * 100)
  const label = `Using ${formatBytes(usage.used)} of ${formatBytes(usage.allocated)}`

  return (
    <div title={collapsed ? label : undefined} className="space-y-1.5">
      {!collapsed && <p className="text-xs text-muted-foreground">{label}</p>}
      <div
        role="progressbar"
        aria-label="Dropbox storage used"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-valuetext={label}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            percent >= 95 ? "bg-destructive" : percent >= 80 ? "bg-caution" : "bg-primary"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

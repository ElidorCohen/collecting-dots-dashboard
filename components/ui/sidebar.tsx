"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ChevronLeft } from "lucide-react"
import { Button } from "./button"

export interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface SidebarProps {
  items: NavItem[]
  bottomItems?: NavItem[]
  appName?: string
  /** Sits above the bottom items; receives whether the sidebar is collapsed. */
  footer?: (collapsed: boolean) => React.ReactNode
}

// /dashboard is the prefix of every page, so it only matches itself
function isActive(pathname: string | null, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname?.startsWith(href + "/"))
}

export function Sidebar({ items, bottomItems = [], appName = "Dashboard", footer }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const pathname = usePathname()

  // Read after mount so the server and first client render agree
  React.useEffect(() => {
    setIsCollapsed(localStorage.getItem("sidebar-collapsed") === "true")
  }, [])

  const toggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem("sidebar-collapsed", String(newState))
  }

  const navLink = (item: NavItem) => {
    const Icon = item.icon
    const active = isActive(pathname, item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        title={isCollapsed ? item.title : undefined}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          isCollapsed && "justify-center px-0"
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!isCollapsed && <span className="flex-1">{item.title}</span>}
        {active && !isCollapsed && <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />}
      </Link>
    )
  }

  return (
    <aside
      className={cn(
        "ink sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-background text-foreground transition-[width] duration-200 lg:flex",
        isCollapsed ? "w-[72px]" : "w-60"
      )}
    >
      <div className={cn("px-5 pb-4 pt-5", isCollapsed && "flex justify-center px-0")}>
        {isCollapsed ? (
          <img src="/cd-logo.svg" alt="Collecting Dots" className="h-7 w-7 object-cover object-left" />
        ) : (
          <>
            <img src="/cd-logo.svg" alt="Collecting Dots" className="h-6 w-auto" />
            <p className="mt-2.5 truncate font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{appName}</p>
          </>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">{items.map(navLink)}</nav>

      {footer && <div className={cn("border-t px-4 py-3.5", isCollapsed && "px-3")}>{footer(isCollapsed)}</div>}

      {bottomItems.length > 0 && <div className="space-y-1 border-t px-3 py-3">{bottomItems.map(navLink)}</div>}

      <div className="border-t px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : undefined}
          className={cn("w-full justify-start gap-3 text-muted-foreground", isCollapsed && "justify-center px-0")}
        >
          <ChevronLeft className={cn("transition-transform", isCollapsed && "rotate-180")} />
          {!isCollapsed && <span>Collapse</span>}
        </Button>
      </div>
    </aside>
  )
}

/** The phone navigation: every page one thumb away instead of behind a menu. */
export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="ink fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] text-foreground lg:hidden">
      <div className="flex">
        {items.map(item => {
          const Icon = item.icon
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {active && <span className="absolute top-1.5 h-1 w-1 rounded-full bg-brand" aria-hidden="true" />}
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

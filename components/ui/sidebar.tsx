"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Music,
  Settings,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react"
import { Button } from "./button"

export interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  disabled?: boolean
}

interface SidebarProps {
  items: NavItem[]
  bottomItems?: NavItem[]
  logo?: React.ReactNode
  appName?: string
  className?: string
}

export function Sidebar({ 
  items, 
  bottomItems = [],
  logo,
  appName = "Dashboard",
  className 
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed')
      return saved === 'true'
    }
    return false
  })
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)
  const pathname = usePathname()

  const toggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', String(newState))
    }
  }

  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen)
  }

  const closeMobile = () => {
    setIsMobileOpen(false)
  }

  // Close mobile menu when route changes
  React.useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  const NavLink = ({ item, isActive }: { item: NavItem; isActive: boolean }) => {
    const Icon = item.icon
    
    if (item.disabled) {
      return (
        <div
          title={isCollapsed ? item.title : undefined}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            "text-muted-foreground cursor-not-allowed opacity-50",
            isCollapsed && "justify-center"
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {!isCollapsed && (
            <>
              <span className="flex-1">{item.title}</span>
              {item.badge && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-muted text-muted-foreground">
                  {item.badge}
                </span>
              )}
            </>
          )}
        </div>
      )
    }

    return (
      <Link
        href={item.href}
        title={isCollapsed ? item.title : undefined}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          isActive
            ? "bg-accent text-accent-foreground font-semibold"
            : "text-muted-foreground",
          isCollapsed && "justify-center"
        )}
        onClick={closeMobile}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!isCollapsed && (
          <>
            <span className="flex-1">{item.title}</span>
            {item.badge && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    )
  }

  const sidebarContent = (
    <>
      {/* Header */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-4 border-b",
        isCollapsed && "justify-center px-2"
      )}>
        {!isCollapsed ? (
          <>
            {logo || (
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center shrink-0">
                <Music className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-foreground truncate">
                {appName}
              </h2>
            </div>
          </>
        ) : (
          logo || (
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Music className="h-5 w-5 text-primary-foreground" />
            </div>
          )
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
          return (
            <NavLink key={item.href} item={item} isActive={isActive} />
          )
        })}
      </nav>

      {/* Bottom Items */}
      {bottomItems.length > 0 && (
        <div className="px-3 py-4 border-t space-y-1">
          {bottomItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
            return (
              <NavLink key={item.href} item={item} isActive={isActive} />
            )
          })}
        </div>
      )}

      {/* Collapse Toggle Button */}
      <div className="px-3 py-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapse}
          className={cn(
            "w-full justify-start gap-3",
            isCollapsed && "justify-center"
          )}
        >
          <ChevronLeft className={cn(
            "h-4 w-4 transition-transform",
            isCollapsed && "rotate-180"
          )} />
          {!isCollapsed && <span className="text-sm">Collapse</span>}
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobile}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-card border shadow-sm hover:bg-accent transition-colors"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full bg-card border-r shadow-sm z-40",
          "flex flex-col transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64",
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className
        )}
      >
        {sidebarContent}
      </aside>

      {/* Spacer for desktop */}
      <div
        className={cn(
          "hidden lg:block transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64"
        )}
      />
    </>
  )
}


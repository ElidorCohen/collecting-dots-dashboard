"use client"

import { BottomNav, Sidebar, type NavItem } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { RoleSwitcher } from "@/components/ui/role-switcher"
import { StorageUsage } from "@/components/ui/storage-usage"
import { useRole } from "@/lib/providers/role-provider"
import { UserButton } from "@clerk/nextjs"
import { LayoutDashboard, Settings, Calendar, Users } from "lucide-react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { currentRole, roleDisplayName } = useRole()
  
  // Define navigation items - using /dashboard as base path now
  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: `/dashboard`,
      icon: LayoutDashboard,
    },
    {
      title: "Events",
      href: `/dashboard/events`,
      icon: Calendar,
    },
    {
      title: "Artists",
      href: `/dashboard/artists`,
      icon: Users,
    },
  ]

  // Bottom navigation items (settings, logout, etc.)
  const bottomItems: NavItem[] = [
    {
      title: "Settings",
      href: `/dashboard/settings`,
      icon: Settings,
    },
  ]

  const appName = currentRole === "admin" ? "Label Owner Dashboard" : "Assistant Dashboard"

  return (
    <div className="min-h-dvh bg-background lg:flex">
      <Sidebar
        items={navItems}
        bottomItems={bottomItems}
        appName={appName}
        footer={collapsed => <StorageUsage collapsed={collapsed} />}
      />

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="ink sticky top-0 z-30 border-b bg-background pt-[env(safe-area-inset-top)] text-foreground">
          <div className="flex h-14 items-center justify-between gap-3 px-4 lg:h-[72px] lg:px-8">
            <img src="/cd-logo.svg" alt="Collecting Dots" className="h-5 w-auto min-w-0 lg:hidden" />
            <div className="hidden min-w-0 lg:block">
              <h1 className="truncate font-semibold">Demo Dashboard - {roleDisplayName} View</h1>
              <p className="truncate text-sm text-muted-foreground">Manage your demo submissions</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              <span className="hidden text-sm text-muted-foreground xl:inline">Current Role:</span>
              <RoleSwitcher />
              <ThemeToggle />
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            {/* The sidebar holds this on desktop */}
            <div className="mb-5 lg:hidden">
              <StorageUsage />
            </div>
            {children}
          </div>
        </main>
      </div>

      <BottomNav items={[...navItems, ...bottomItems]} />
    </div>
  )
}

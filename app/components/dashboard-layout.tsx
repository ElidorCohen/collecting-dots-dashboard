"use client"

import { Sidebar, type NavItem } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { RoleSwitcher } from "@/components/ui/role-switcher"
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
    <div className="min-h-screen bg-background flex">
      <Sidebar 
        items={navItems}
        bottomItems={bottomItems}
        appName={appName}
      />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-card border-b shadow-sm sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Demo Dashboard - {roleDisplayName} View
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage your demo submissions
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground hidden sm:inline">Current Role:</span>
                <RoleSwitcher />
                <ThemeToggle />
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}


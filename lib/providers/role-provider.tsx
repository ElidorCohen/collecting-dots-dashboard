"use client"

import * as React from "react"
import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export type UserRole = "admin" | "assistant"

interface RoleContextType {
  currentRole: UserRole
  setRole: (role: UserRole) => void
  isAdmin: boolean
  isAssistant: boolean
  roleDisplayName: string
  isHydrated: boolean
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

const ROLE_STORAGE_KEY = "dashboard-current-role"

interface RoleProviderProps {
  children: ReactNode
  defaultRole?: UserRole
}

export function RoleProvider({ children, defaultRole = "assistant" }: RoleProviderProps) {
  const [currentRole, setCurrentRole] = useState<UserRole>(defaultRole)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load role from localStorage on mount
  useEffect(() => {
    const savedRole = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null
    if (savedRole && (savedRole === "admin" || savedRole === "assistant")) {
      setCurrentRole(savedRole)
    }
    setIsHydrated(true)
  }, [])

  // Persist role changes to localStorage
  const setRole = (role: UserRole) => {
    setCurrentRole(role)
    localStorage.setItem(ROLE_STORAGE_KEY, role)
  }

  const value: RoleContextType = {
    currentRole,
    setRole,
    isAdmin: currentRole === "admin",
    isAssistant: currentRole === "assistant",
    roleDisplayName: currentRole === "admin" ? "Label Owner" : "Assistant",
    isHydrated,
  }

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider")
  }
  return context
}


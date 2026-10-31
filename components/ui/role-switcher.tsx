"use client"

import * as React from "react"
import { useRole, type UserRole } from "@/lib/providers/role-provider"
import { cn } from "@/lib/utils"
import { Crown, Users, ChevronDown, Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface RoleSwitcherProps {
  className?: string
}

const roleConfig: Record<UserRole, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  admin: { label: "Label Owner", icon: Crown },
  assistant: { label: "Assistant", icon: Users },
}

export function RoleSwitcher({ className }: RoleSwitcherProps) {
  const { currentRole, setRole } = useRole()
  const config = roleConfig[currentRole]
  const Icon = config.icon

  const handleRoleChange = (role: UserRole) => {
    if (role !== currentRole) {
      setRole(role)
    }
  }

  const availableRoles: UserRole[] = ['admin', 'assistant']

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex h-10 items-center gap-2 rounded-lg border border-input px-3 text-sm font-medium transition-colors hover:bg-accent sm:h-9",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className
          )}
        >
          <Icon className="h-4 w-4 text-brand" />
          <span>{config.label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {availableRoles.map((role) => {
          const roleItem = roleConfig[role]
          const RoleIcon = roleItem.icon
          const isSelected = role === currentRole

          return (
            <DropdownMenuItem
              key={role}
              onClick={() => handleRoleChange(role)}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                isSelected && "bg-accent"
              )}
            >
              <RoleIcon className="w-4 h-4" />
              <span className={cn("flex-1", isSelected && "font-medium")}>
                {roleItem.label}
              </span>
              {isSelected && (
                <Check className="w-4 h-4 text-brand" />
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


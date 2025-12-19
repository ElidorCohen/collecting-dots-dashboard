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

const roleConfig: Record<UserRole, { 
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  borderColor: string
  hoverBg: string
}> = {
  admin: {
    label: "Label Owner",
    icon: Crown,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-amber-200 dark:border-amber-800",
    hoverBg: "hover:bg-amber-100 dark:hover:bg-amber-900/30",
  },
  assistant: {
    label: "Assistant",
    icon: Users,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    hoverBg: "hover:bg-blue-100 dark:hover:bg-blue-900/30",
  },
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
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50",
            config.bgColor,
            config.borderColor,
            config.hoverBg,
            className
          )}
        >
          <Icon className={cn("w-4 h-4", config.color)} />
          <span className={cn("text-sm font-medium", config.color)}>
            {config.label}
          </span>
          <ChevronDown className={cn("w-3.5 h-3.5 ml-1", config.color)} />
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
                isSelected && roleItem.bgColor
              )}
            >
              <RoleIcon className={cn("w-4 h-4", roleItem.color)} />
              <span className={cn("flex-1", isSelected && "font-medium")}>
                {roleItem.label}
              </span>
              {isSelected && (
                <Check className={cn("w-4 h-4", roleItem.color)} />
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


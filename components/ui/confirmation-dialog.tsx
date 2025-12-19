"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle, XCircle, ThumbsUp, ThumbsDown } from "lucide-react"

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText: string
  cancelText?: string
  type?: "like" | "reject" | "approve" | "warning" | "undo_reject" | "destructive"
  trackTitle?: string
  isLoading?: boolean
}

const typeConfig = {
  like: {
    icon: ThumbsUp,
    iconColor: "text-green-600",
    confirmButtonClass: "bg-green-600 hover:bg-green-700 text-white"
  },
  reject: {
    icon: XCircle,
    iconColor: "text-red-600",
    confirmButtonClass: "bg-red-600 hover:bg-red-700 text-white"
  },
  approve: {
    icon: CheckCircle,
    iconColor: "text-emerald-600",
    confirmButtonClass: "bg-emerald-600 hover:bg-emerald-700 text-white"
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-amber-600",
    confirmButtonClass: "bg-amber-600 hover:bg-amber-700 text-white"
  },
  undo_reject: {
    icon: ThumbsUp,
    iconColor: "text-blue-600",
    confirmButtonClass: "bg-blue-600 hover:bg-blue-700 text-white"
  },
  destructive: {
    icon: XCircle,
    iconColor: "text-red-600",
    confirmButtonClass: "bg-red-600 hover:bg-red-700 text-white"
  }
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText = "Cancel",
  type = "warning",
  trackTitle,
  isLoading = false
}: ConfirmationDialogProps) {
  const config = typeConfig[type]
  const Icon = config.icon

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full bg-gray-50 ${config.iconColor}`}>
              <Icon className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-left text-base">
            {description}
          </DialogDescription>
          {trackTitle && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm font-medium text-gray-900">Demo Track:</p>
              <p className="text-gray-700 font-semibold">"{trackTitle}"</p>
            </div>
          )}
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            className={config.confirmButtonClass}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
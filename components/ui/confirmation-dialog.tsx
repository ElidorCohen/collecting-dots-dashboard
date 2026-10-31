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
  like: { icon: ThumbsUp, tone: "bg-positive/15 text-positive", confirmVariant: "positive" },
  reject: { icon: XCircle, tone: "bg-destructive/10 text-destructive", confirmVariant: "destructive" },
  approve: { icon: CheckCircle, tone: "bg-positive/15 text-positive", confirmVariant: "positive" },
  warning: { icon: AlertTriangle, tone: "bg-caution/15 text-caution", confirmVariant: "default" },
  undo_reject: { icon: ThumbsUp, tone: "bg-muted text-foreground", confirmVariant: "default" },
  destructive: { icon: XCircle, tone: "bg-destructive/10 text-destructive", confirmVariant: "destructive" },
} as const

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
            <div className={`rounded-full p-2 ${config.tone}`}>
              <Icon className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-left text-base">
            {description}
          </DialogDescription>
          {trackTitle && (
            <div className="mt-3 rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">Demo Track:</p>
              <p className="font-semibold text-foreground">"{trackTitle}"</p>
            </div>
          )}
        </DialogHeader>
        <DialogFooter className="gap-2 sm:space-x-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
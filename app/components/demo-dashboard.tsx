"use client"

import { useState, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { CalendarDays, ExternalLink, Music, ThumbsDown, ThumbsUp, User, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { demoService, type Demo, type DemoStatus, type DemosApiResponse, apiUtils } from '@/lib/services'
import { useApi } from '@/lib/hooks/useApi'
import { useRole, type UserRole } from '@/lib/providers/role-provider'

interface DemoDashboardProps {
  initialData?: any; // Make this optional since we'll fetch real data
  status: string;
}

const statusConfig = {
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: Music },
  liked: { label: "Liked by Assistant", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: ThumbsUp }, // Legacy
  assistant_liked: { label: "Liked by Assistant", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: ThumbsUp },
  owner_liked: { label: "Approved by Owner", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", icon: CheckCircle },
  rejected_by_assistant: { label: "Rejected by Assistant", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: ThumbsDown },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: ThumbsDown },
  approved: { label: "Approved by Admin", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", icon: CheckCircle },
  rejected_by_admin: { label: "Rejected by Admin", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: XCircle },
}

export default function DemoDashboard({ status }: DemoDashboardProps) {
  const [demos, setDemos] = useState<Demo[]>([])
  const { currentRole: currentUser } = useRole()
  const [statusFilter, setStatusFilter] = useState<string>(status)
  
  // Ref to track scroll position for preservation
  const scrollPositionRef = useRef<number>(0)
  const shouldPreserveScroll = useRef<boolean>(false)
  
  // Per-demo loading states for individual card operations
  const [demoLoadingStates, setDemoLoadingStates] = useState<Record<string, boolean>>({})
  
  // Track optimistic updates - store the expected new status while API call is in progress
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, DemoStatus>>({})
  
  // Dialog state management
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    type: "like" | "reject" | "approve" | "undo_reject"
    title: string
    description: string
    confirmText: string
    demoId: string
    trackTitle: string
    rejectionType?: "rejected_by_assistant" | "rejected_by_admin"
  } | null>(null)

  // API hooks for different operations
  const dashboardApi = useApi<DemosApiResponse>({
    onSuccess: (apiResponse) => {
      console.log('API Response received:', apiResponse);
      console.log('Current user role:', currentUser);
      console.log('Status filter:', statusFilter);
      
      // Get all demos from the response
      let filteredDemos = apiResponse.demos;
      console.log('All demos before filtering:', filteredDemos);
      
      // Apply status filter first
      if (statusFilter && statusFilter !== 'all') {
        // Map filter values to actual backend status values
        const statusMapping: { [key: string]: string[] } = {
          'submitted': ['submitted'],
          'liked': ['assistant_liked'], // Map to actual backend status
          'assistant_liked': ['assistant_liked'],
          'rejected_by_assistant': ['rejected'], // Map to actual backend status
          'rejected': ['rejected'],
          'approved': ['approved'],
          'rejected_by_admin': ['rejected_by_admin'],
          'owner_liked': ['owner_liked']
        };
        
        const allowedStatuses = statusMapping[statusFilter] || [statusFilter];
        filteredDemos = filteredDemos.filter((demo: Demo) => 
          allowedStatuses.includes(demo.status)
        );
        console.log(`Demos after status filter (${statusFilter}):`, filteredDemos);
      }
      // When "All Statuses" is selected, show ALL demos without any filtering
      
      // Sort demos by date (newest first) - this happens after filtering
      console.log('=== SORTING DEBUG START ===');
      console.log('Demos before sorting:', filteredDemos.map((d: Demo) => ({
        id: d.demo_id,
        title: d.track_title,
        submitted_at: d.submitted_at,
        submitted_at_type: typeof d.submitted_at,
        submitted_at_length: d.submitted_at?.length
      })));
      
      filteredDemos.sort((a: Demo, b: Demo) => {
        // Parse the YYYYMMDD_HHMMSS format to proper dates for comparison
        const parseSubmittedAt = (dateString: string): Date => {
          console.log(`Parsing date string: "${dateString}" (type: ${typeof dateString}, length: ${dateString?.length})`);
          
          // Handle null/undefined/empty values
          if (!dateString) {
            console.log('  -> Empty date string, using current date as fallback');
            return new Date();
          }
          
          try {
            // Format: "20250912_143000" -> "2025-09-12T14:30:00"
            if (dateString.length === 15 && dateString.includes('_')) {
              const [datePart, timePart] = dateString.split('_');
              const year = datePart.substring(0, 4);
              const month = datePart.substring(4, 6);
              const day = datePart.substring(6, 8);
              const hour = timePart.substring(0, 2);
              const minute = timePart.substring(2, 4);
              const second = timePart.substring(4, 6);
              
              const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
              const parsedDate = new Date(isoString);
              
              // Check if the parsed date is valid
              if (isNaN(parsedDate.getTime())) {
                console.log(`  -> Invalid date after parsing ISO string: "${isoString}"`);
                return new Date(); // Fallback to current date
              }
              
              console.log(`  -> ISO string: "${isoString}"`);
              console.log(`  -> Parsed date: ${parsedDate.toISOString()}`);
              console.log(`  -> Timestamp: ${parsedDate.getTime()}`);
              
              return parsedDate;
            }
            
            // Try standard date formats (YYYY-MM-DD, etc.)
            const fallbackDate = new Date(dateString);
            if (isNaN(fallbackDate.getTime())) {
              console.log(`  -> Failed to parse as standard date: "${dateString}"`);
              return new Date(); // Fallback to current date
            }
            
            console.log(`  -> Fallback date: ${fallbackDate.toISOString()}`);
            return fallbackDate;
          } catch (error) {
            console.error(`  -> Error parsing date "${dateString}":`, error);
            return new Date(); // Fallback to current date
          }
        };
        
        const dateA = parseSubmittedAt(a.submitted_at);
        const dateB = parseSubmittedAt(b.submitted_at);
        
        const comparison = dateB.getTime() - dateA.getTime();
        console.log(`Comparing: ${a.track_title} (${dateA.getTime()}) vs ${b.track_title} (${dateB.getTime()}) = ${comparison}`);
        
        // Sort in descending order (newest first)
        return comparison;
      });
      
      console.log('Demos after sorting:', filteredDemos.map((d: Demo) => ({
        id: d.demo_id,
        title: d.track_title,
        submitted_at: d.submitted_at
      })));
      console.log('=== SORTING DEBUG END ===');
      
      console.log('Final filtered and sorted demos:', filteredDemos);
      setDemos(filteredDemos);
      
      // Restore scroll position if we need to preserve it
      if (shouldPreserveScroll.current) {
        // Use requestAnimationFrame for more reliable timing after DOM updates
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.scrollTo({
              top: scrollPositionRef.current,
              behavior: 'instant' // Prevent smooth scrolling animation
            })
            shouldPreserveScroll.current = false
          })
        })
      }
    },
    onError: (error) => {
      console.error('Failed to fetch demos:', error)
      console.error('Error details:', apiUtils.formatApiError(error))
    }
  })

  const updateStatusApi = useApi<Demo>({
    onSuccess: () => {
      // Refresh dashboard data after successful update with scroll preservation
      fetchDemos(true)
    },
    onError: (error) => {
      console.error('Failed to update demo status:', error)
    }
  })

  // Update statusFilter when status prop changes
  useEffect(() => {
    setStatusFilter(status)
  }, [status])

  // Fetch demos using the real API service
  const fetchDemos = async (preserveScroll: boolean = false) => {
    // Store scroll position if we need to preserve it
    if (preserveScroll) {
      scrollPositionRef.current = window.scrollY
      shouldPreserveScroll.current = true
    }
    
    try {
      await dashboardApi.execute(() => demoService.getAllDemos())
    } catch (error) {
      console.error('Dashboard fetch error:', apiUtils.getErrorMessage(error))
    }
  }

  // Fetch data when filters change
  useEffect(() => {
    fetchDemos()
  }, [currentUser, statusFilter])

  // Helper functions for per-demo loading management
  const setDemoLoading = (demoId: string, isLoading: boolean) => {
    setDemoLoadingStates(prev => ({
      ...prev,
      [demoId]: isLoading
    }))
  }

  const isDemoLoading = (demoId: string) => {
    return demoLoadingStates[demoId] || false
  }

  // Helper function to apply optimistic update
  const applyOptimisticUpdate = (demoId: string, expectedStatus: DemoStatus) => {
    setOptimisticUpdates(prev => ({
      ...prev,
      [demoId]: expectedStatus
    }))
  }

  // Helper function to clear optimistic update
  const clearOptimisticUpdate = (demoId: string) => {
    setOptimisticUpdates(prev => {
      const updated = { ...prev }
      delete updated[demoId]
      return updated
    })
  }

  // Wrapper function for button clicks to prevent default behavior and preserve scroll
  const handleActionClick = async (
    e: React.MouseEvent,
    demoId: string,
    actionType: 'like' | 'reject' | 'approve' | 'undo_reject',
    expectedStatus: DemoStatus
  ) => {
    e.preventDefault()
    e.stopPropagation()
    
    try {
      await performDemoAction(demoId, actionType, expectedStatus)
      setConfirmDialog(null)
    } catch (error) {
      // Error handling is done in performDemoAction
    }
  }

  // Enhanced demo action handler with per-demo loading and optimistic updates
  const performDemoAction = async (
    demoId: string, 
    actionType: 'like' | 'reject' | 'approve' | 'undo_reject',
    expectedStatus: DemoStatus
  ) => {
    console.log('🎬 UI ACTION TRIGGERED:')
    console.log('  🎯 Demo ID:', demoId)
    console.log('  ⚡ Action Type:', actionType)
    console.log('  🎭 Expected Status:', expectedStatus)
    console.log('  👤 Current User:', currentUser)
    
    // Set loading state for this specific demo
    setDemoLoading(demoId, true)
    
    // Apply optimistic update immediately for better UX
    applyOptimisticUpdate(demoId, expectedStatus)

    try {
      if (currentUser === "assistant") {
        let action: 'like' | 'reject' | 'undo_reject'
        if (actionType === "like") action = "like"
        else if (actionType === "reject") action = "reject"
        else if (actionType === "undo_reject") action = "undo_reject"
        else return
        
        console.log('🔧 CALLING ASSISTANT ACTION:', { demoId, action })
        await demoService.assistantAction(demoId, action)
      } else if (currentUser === "admin") {
        let action: 'approve' | 'reject' | 'undo_reject' | 'like'
        if (actionType === "approve") action = "approve"
        else if (actionType === "reject") action = "reject"
        else if (actionType === "undo_reject") action = "undo_reject"
        else if (actionType === "like") action = "like"
        else return
        
        console.log('🔧 CALLING OWNER ACTION:', { demoId, action })
        await demoService.ownerAction(demoId, action)
      }

      // Update local state with the new status
      setDemos(prevDemos =>
        prevDemos.map(demo =>
          demo.demo_id === demoId
            ? { ...demo, status: expectedStatus }
            : demo
        )
      )

      // Clear optimistic update after state is updated
      clearOptimisticUpdate(demoId)
    } catch (error) {
      console.error('❌ Demo action failed:', error)
      // Revert optimistic update on error
      clearOptimisticUpdate(demoId)
      throw error
    } finally {
      // Always clear loading state
      setDemoLoading(demoId, false)
    }
  }

  // Update demo status using the new API service
  const updateDemoStatus = async (demoId: string, newStatus: DemoStatus) => {
    try {
      await updateStatusApi.execute(() => 
        demoService.updateDemoStatus(demoId, newStatus)
      )
    } catch (error) {
      console.error('Status update error:', apiUtils.getErrorMessage(error))
    }
  }

  // Handle Like action with confirmation
  const handleLikeDemo = (demoId: string, trackTitle: string) => {
    setConfirmDialog({
      isOpen: true,
      type: "like",
      title: "Like Demo",
      description: "This will move the demo to the admin review stage where it can be approved or rejected.",
      confirmText: "Like Demo",
      demoId,
      trackTitle
    })
  }

  // Handle Reject action with confirmation
  const handleRejectDemo = (demoId: string, trackTitle: string, rejectionType: "rejected_by_assistant" | "rejected_by_admin") => {
    const rejectBy = rejectionType === "rejected_by_assistant" ? "Assistant" : "Admin"
    setConfirmDialog({
      isOpen: true,
      type: "reject",
      title: "Reject Demo",
      description: `This action will mark the demo as rejected by ${rejectBy}. The demo will not proceed to the next stage.`,
      confirmText: "Reject Demo",
      demoId,
      trackTitle,
      rejectionType
    })
  }

  // Handle Approve action with confirmation
  const handleApproveDemo = (demoId: string, trackTitle: string) => {
    setConfirmDialog({
      isOpen: true,
      type: "approve",
      title: "Approve Demo",
      description: "This will mark the demo as approved and ready for release. This is the final approval step.",
      confirmText: "Approve Demo",
      demoId,
      trackTitle
    })
  }

  // Handle Owner Reject action with confirmation
  const handleOwnerRejectDemo = (demoId: string, trackTitle: string) => {
    setConfirmDialog({
      isOpen: true,
      type: "reject",
      title: "Reject Demo",
      description: "This action will mark the demo as rejected by the owner. The demo will not proceed to the next stage.",
      confirmText: "Reject Demo",
      demoId,
      trackTitle
    })
  }

  // Handle Undo Reject action with confirmation
  const handleUndoRejectDemo = (demoId: string, trackTitle: string) => {
    setConfirmDialog({
      isOpen: true,
      type: "undo_reject",
      title: "Undo Reject",
      description: "This will move the demo back to assistant liked status for reconsideration.",
      confirmText: "Undo Reject",
      demoId,
      trackTitle
    })
  }

  // Handle dialog confirmation
  const handleDialogConfirm = async () => {
    if (!confirmDialog) return

    try {
      console.log('User confirmed action:', confirmDialog.type, 'for demo:', confirmDialog.demoId)
      
      // Use the new assistant action endpoint for assistant actions
      if (currentUser === "assistant") {
        let action: 'like' | 'reject' | 'undo_reject'
        
        if (confirmDialog.type === "like") {
          action = "like"
        } else if (confirmDialog.type === "reject") {
          action = "reject"
        } else if (confirmDialog.type === "undo_reject") {
          action = "undo_reject"
        } else {
          return // Assistant shouldn't have approve actions
        }

        // Call the new assistant action endpoint
        await updateStatusApi.execute(() => 
          demoService.assistantAction(confirmDialog.demoId, action)
        )
      } else if (currentUser === "admin") {
        // Use the new owner action endpoint for admin actions
        if (confirmDialog.type === "approve" || confirmDialog.type === "reject" || confirmDialog.type === "undo_reject" || confirmDialog.type === "like") {
          let action: 'approve' | 'reject' | 'undo_reject' | 'like'
          
          if (confirmDialog.type === "approve") {
            action = "approve"
          } else if (confirmDialog.type === "reject") {
            action = "reject"
          } else if (confirmDialog.type === "undo_reject") {
            action = "undo_reject"
          } else if (confirmDialog.type === "like") {
            action = "like"
          }

          // Call the new owner action endpoint
          await updateStatusApi.execute(() => 
            demoService.ownerAction(confirmDialog.demoId, action)
          )
        }
      }
      
      // Close dialog after successful action
      setConfirmDialog(null)
    } catch (error) {
      console.error('Action failed:', error)
      // Dialog stays open on error so user can retry or cancel
    }
  }

  // Close dialog
  const handleDialogClose = () => {
    setConfirmDialog(null)
  }

  // Calculate counts from current demos
  const getCounts = () => {
    const allDemos = demos; // In a real app, you'd want all demos for accurate counts
    return {
      submitted: allDemos.filter(d => d.status === 'submitted').length,
      liked: allDemos.filter(d => d.status === 'assistant_liked' || d.status === 'liked').length,
      rejected_by_assistant: allDemos.filter(d => d.status === 'rejected' || d.status === 'rejected_by_assistant' || d.status === 'rejected_by_admin').length,
      approved: allDemos.filter(d => d.status === 'owner_liked' || d.status === 'approved').length,
    }
  }

  const counts = getCounts()

  const StatusBadge = ({ status }: { status: DemoStatus }) => {
    const config = statusConfig[status]
    const Icon = config.icon
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  const DemoCard = ({ demo }: { demo: Demo }) => {
    const isLoading = isDemoLoading(demo.demo_id)
    const optimisticStatus = optimisticUpdates[demo.demo_id]
    const displayStatus = optimisticStatus || demo.status
    
    return (
      <Card className={`mb-4 transition-all duration-300 ${isLoading ? 'opacity-60' : 'opacity-100'}`}>
        <CardContent className="p-6 relative">
          {/* Loading overlay for better visual feedback */}
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
              <div className="bg-card rounded-lg shadow-lg p-4 flex items-center gap-3 border">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm font-medium text-foreground">Processing...</span>
              </div>
            </div>
          )}

          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-1">{demo.track_title}</h3>
              <p className="text-muted-foreground mb-2">{demo.artist_name}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CalendarDays className="w-4 h-4" />
                  <span>Submitted: {demo.submitted_at}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{demo.email}</span>
                </div>
                <a
                  href={demo.shared_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Listen on Dropbox
                </a>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="relative">
                <StatusBadge status={displayStatus} />
                {optimisticStatus && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                )}
              </div>
              {displayStatus === "rejected" && (
                <p className="text-xs text-red-600 dark:text-red-400 italic">Demo will be auto-deleted once a day</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            {currentUser === "assistant" && demo.status === "submitted" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 dark:text-green-400 border-green-600 dark:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 bg-transparent disabled:opacity-50"
                  onClick={(e) => handleActionClick(e, demo.demo_id, "like", "assistant_liked")}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <ThumbsUp className="w-4 h-4 mr-1" />
                  )}
                  Like
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 dark:text-red-400 border-red-600 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 bg-transparent disabled:opacity-50"
                  onClick={async () => {
                    try {
                      await performDemoAction(demo.demo_id, "reject", "rejected")
                      setConfirmDialog(null)
                    } catch (error) {
                      // Error handling is done in performDemoAction
                    }
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <ThumbsDown className="w-4 h-4 mr-1" />
                  )}
                  Reject
                </Button>
              </>
            )}

            {/* Admin/Owner actions on submitted demos */}
            {currentUser === "admin" && demo.status === "submitted" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 dark:text-green-400 border-green-600 dark:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 bg-transparent disabled:opacity-50"
                  onClick={async () => {
                    try {
                      await performDemoAction(demo.demo_id, "like", "assistant_liked")
                      setConfirmDialog(null)
                    } catch (error) {
                      // Error handling is done in performDemoAction
                    }
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <ThumbsUp className="w-4 h-4 mr-1" />
                  )}
                  Like
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 dark:text-red-400 border-red-600 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 bg-transparent disabled:opacity-50"
                  onClick={async () => {
                    try {
                      await performDemoAction(demo.demo_id, "reject", "rejected")
                      setConfirmDialog(null)
                    } catch (error) {
                      // Error handling is done in performDemoAction
                    }
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <ThumbsDown className="w-4 h-4 mr-1" />
                  )}
                  Reject
                </Button>
              </>
            )}

            {currentUser === "admin" && (demo.status === "assistant_liked" || demo.status === "liked") && (
              <>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                  onClick={async () => {
                    try {
                      await performDemoAction(demo.demo_id, "approve", "approved")
                      setConfirmDialog(null)
                    } catch (error) {
                      // Error handling is done in performDemoAction
                    }
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-1" />
                  )}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 dark:text-red-400 border-red-600 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 bg-transparent disabled:opacity-50"
                  onClick={async () => {
                    try {
                      await performDemoAction(demo.demo_id, "reject", "rejected")
                      setConfirmDialog(null)
                    } catch (error) {
                      // Error handling is done in performDemoAction
                    }
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-1" />
                  )}
                  Reject
                </Button>
              </>
            )}

            {/* Assistant undo reject actions */}
            {currentUser === "assistant" && demo.status === "rejected" && (
              <Button
                size="sm"
                variant="outline"
                  className="text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 bg-transparent disabled:opacity-50"
                onClick={async () => {
                  try {
                    await performDemoAction(demo.demo_id, "undo_reject", "assistant_liked")
                    setConfirmDialog(null)
                  } catch (error) {
                    // Error handling is done in performDemoAction
                  }
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <ThumbsUp className="w-4 h-4 mr-1" />
                )}
                Undo Reject
              </Button>
            )}

            {/* Admin/Owner undo reject actions */}
            {currentUser === "admin" && demo.status === "rejected" && (
              <Button
                size="sm"
                variant="outline"
                  className="text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 bg-transparent disabled:opacity-50"
                onClick={async () => {
                  try {
                    await performDemoAction(demo.demo_id, "undo_reject", "assistant_liked")
                    setConfirmDialog(null)
                  } catch (error) {
                    // Error handling is done in performDemoAction
                  }
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <ThumbsUp className="w-4 h-4 mr-1" />
                )}
                Undo Reject
              </Button>
            )}
          </div>

          {/* HTML5 Audio Player - positioned below action buttons */}
          <div className="mt-4 pt-4 border-t border-border">
            <audio
              controls
              className="w-full"
              preload="metadata"
              onError={(e) => {
                console.log("Audio loading error:", e)
              }}
            >
              <source
                src={demo.shared_link}
                type="audio/mpeg"
              />
              <source
                src={demo.shared_link}
                type="audio/wav"
              />
              Your browser does not support the audio element.
            </audio>
            <div className="text-xs text-muted-foreground mt-2 text-center">
              {demo.track_title} by {demo.artist_name}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-foreground">Demo Submission Dashboard</h1>
          </div>

          {/* Display API loading state */}
          {dashboardApi.loading && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-blue-700 dark:text-blue-300">Loading demos from API...</span>
            </div>
          )}

          {/* Display API errors */}
          {dashboardApi.error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <p className="text-red-700 dark:text-red-300">Failed to load demos: {dashboardApi.error}</p>
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-2"
                onClick={() => fetchDemos()}
                disabled={dashboardApi.loading}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Submitted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{counts.submitted}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Liked</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{counts.liked}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{counts.approved}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Rejected (Assistant & Admin)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{counts.rejected_by_assistant}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">Filter by status:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="assistant_liked">Liked by Assistant</SelectItem>
                <SelectItem value="owner_liked">Approved by Owner</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            {dashboardApi.loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
        </div>

        {/* Demo List */}
        <div className="space-y-4">
          {/* Debug Panel - Remove this after debugging */}
          {demos.length === 0 && !dashboardApi.loading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No demos found</h3>
                <p className="text-muted-foreground">
                  {currentUser === "assistant"
                    ? "No submitted demos to review at the moment."
                    : "No demos liked by Assistant to review at the moment."}
                </p>
              </CardContent>
            </Card>
          ) : (
            demos.map((demo) => <DemoCard key={demo.demo_id} demo={demo} />)
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          onClose={handleDialogClose}
          onConfirm={handleDialogConfirm}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmText={confirmDialog.confirmText}
          type={confirmDialog.type}
          trackTitle={confirmDialog.trackTitle}
          isLoading={updateStatusApi.loading}
        />
      )}
    </div>
  )
}

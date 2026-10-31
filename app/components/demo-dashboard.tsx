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

const NEUTRAL = "border-transparent bg-muted text-foreground"
const LIKED = "border-transparent bg-positive/15 text-positive"
const APPROVED = "border-transparent bg-positive text-positive-foreground"
const REJECTED = "border-transparent bg-destructive/10 text-destructive"

const statusConfig = {
  submitted: { label: "Submitted", color: NEUTRAL, icon: Music },
  liked: { label: "Liked by Assistant", color: LIKED, icon: ThumbsUp }, // Legacy
  assistant_liked: { label: "Liked by Assistant", color: LIKED, icon: ThumbsUp },
  owner_liked: { label: "Approved by Owner", color: APPROVED, icon: CheckCircle },
  rejected_by_assistant: { label: "Rejected by Assistant", color: REJECTED, icon: ThumbsDown },
  rejected: { label: "Rejected", color: REJECTED, icon: ThumbsDown },
  approved: { label: "Approved by Admin", color: APPROVED, icon: CheckCircle },
  rejected_by_admin: { label: "Rejected by Admin", color: REJECTED, icon: XCircle },
}

export default function DemoDashboard({ status }: DemoDashboardProps) {
  const [demos, setDemos] = useState<Demo[]>([])
  const [allDemos, setAllDemos] = useState<Demo[]>([]) // Store all demos for accurate counts
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
      
      // Apply status filter
      if (statusFilter && statusFilter !== 'all') {
        // Map filter values to actual backend status values
        const statusMapping: { [key: string]: string[] } = {
          'submitted': ['submitted'],
          'liked': ['assistant_liked'], // Map to actual backend status
          'assistant_liked': ['assistant_liked'],
          'rejected_by_assistant': ['rejected'], // Map to actual backend status
          'rejected': ['rejected', 'rejected_by_assistant', 'rejected_by_admin'], // Include all rejected statuses
          'approved': ['approved'],
          'rejected_by_admin': ['rejected_by_admin'],
          'owner_liked': ['owner_liked']
        };
        
        const allowedStatuses = statusMapping[statusFilter] || [statusFilter];
        filteredDemos = filteredDemos.filter((demo: Demo) => 
          allowedStatuses.includes(demo.status)
        );
        console.log(`Demos after status filter (${statusFilter}):`, filteredDemos);
      } else {
        // When "All Statuses" is selected, exclude rejected demos
        const rejectedStatuses = ['rejected', 'rejected_by_assistant', 'rejected_by_admin'];
        filteredDemos = filteredDemos.filter((demo: Demo) => 
          !rejectedStatuses.includes(demo.status)
        );
        console.log('Demos after excluding rejected (All Statuses):', filteredDemos);
      }
      
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
      setAllDemos(apiResponse.demos); // Store all demos for count calculations
      
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

  // Calculate counts from all demos (not filtered) for accurate counts
  const getCounts = () => {
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
      <Card className={`transition-opacity duration-300 ${isLoading ? 'opacity-60' : 'opacity-100'}`}>
        <CardContent className="relative p-4 sm:p-6">
          {/* Loading overlay for better visual feedback */}
          {isLoading && (
            <div className="absolute inset-0 z-10 flex rounded-2xl bg-card/60 backdrop-blur-sm items-center justify-center">
              <div className="bg-card rounded-lg shadow-lg p-4 flex items-center gap-3 border">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm font-medium text-foreground">Processing...</span>
              </div>
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="min-w-0 flex-1 basis-56">
              <h3 className="break-words text-lg font-semibold leading-snug text-foreground">{demo.track_title}</h3>
              <p className="text-muted-foreground">{demo.artist_name}</p>
            </div>
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <div className="relative">
                <StatusBadge status={displayStatus} />
                {optimisticStatus && (
                  <div className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-brand" />
                )}
              </div>
              {displayStatus === "rejected" && (
                <p className="text-xs text-destructive">Demo will be auto-deleted once a day</p>
              )}
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-1.5 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
            <div className="flex min-w-0 items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0" />
              <span>Submitted: {demo.submitted_at}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <User className="h-4 w-4 shrink-0" />
              <span className="truncate">{demo.email}</span>
            </div>
            <a
              href={demo.shared_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-medium text-foreground underline-offset-4 hover:underline"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              Listen on Dropbox
            </a>
          </div>

          <div className="flex flex-wrap gap-2 empty:hidden [&>button]:flex-1 sm:[&>button]:flex-none">
            {currentUser === "assistant" && demo.status === "submitted" && (
              <>
                <Button
                  size="sm"
                  variant="positive"
                  onClick={(e) => handleActionClick(e, demo.demo_id, "like", "assistant_liked")}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <ThumbsUp />
                  )}
                  Like
                </Button>
                <Button
                  size="sm"
                  variant="negative"
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
                    <Loader2 className="animate-spin" />
                  ) : (
                    <ThumbsDown />
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
                  variant="positive"
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
                    <Loader2 className="animate-spin" />
                  ) : (
                    <ThumbsUp />
                  )}
                  Like
                </Button>
                <Button
                  size="sm"
                  variant="negative"
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
                    <Loader2 className="animate-spin" />
                  ) : (
                    <ThumbsDown />
                  )}
                  Reject
                </Button>
              </>
            )}

            {currentUser === "admin" && (demo.status === "assistant_liked" || demo.status === "liked") && (
              <>
                <Button
                  size="sm"
                  variant="positive"
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
                    <Loader2 className="animate-spin" />
                  ) : (
                    <CheckCircle />
                  )}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="negative"
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
                    <Loader2 className="animate-spin" />
                  ) : (
                    <XCircle />
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
                  <Loader2 className="animate-spin" />
                ) : (
                  <ThumbsUp />
                )}
                Undo Reject
              </Button>
            )}

            {/* Admin/Owner undo reject actions */}
            {currentUser === "admin" && demo.status === "rejected" && (
              <Button
                size="sm"
                variant="outline"
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
                  <Loader2 className="animate-spin" />
                ) : (
                  <ThumbsUp />
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
            <div className="mt-2 truncate text-center text-xs text-muted-foreground">
              {demo.track_title} by {demo.artist_name}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="mb-5 font-display text-3xl text-foreground sm:text-4xl">Demo Submission Dashboard</h1>

          {/* Display API loading state */}
          {dashboardApi.loading && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading demos from API...</span>
            </div>
          )}

          {/* Display API errors */}
          {dashboardApi.error && (
            <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">Failed to load demos: {dashboardApi.error}</p>
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

          {/* Summary Cards double as the quickest way to filter */}
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Submitted", count: counts.submitted, filter: "submitted", tone: "bg-muted-foreground" },
              { label: "Liked", count: counts.liked, filter: "assistant_liked", tone: "bg-positive" },
              { label: "Approved", count: counts.approved, filter: "owner_liked", tone: "bg-positive" },
              { label: "Rejected (Assistant & Admin)", count: counts.rejected_by_assistant, filter: "rejected", tone: "bg-destructive" },
            ].map(({ label, count, filter, tone }) => (
              <button
                key={filter}
                type="button"
                aria-pressed={statusFilter === filter}
                onClick={() => setStatusFilter(statusFilter === filter ? "all" : filter)}
                className={`rounded-2xl border bg-card p-4 text-left transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${statusFilter === filter ? "border-foreground" : ""}`}
              >
                <span className="flex items-start gap-2 text-xs font-medium leading-snug text-muted-foreground">
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} aria-hidden="true" />
                  {label}
                </span>
                <span className="mt-2 block font-display text-3xl text-foreground">{count}</span>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-sm font-medium text-foreground">Filter by status:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-52">
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
          </div>
        </div>

        {/* Demo List */}
        <div className="space-y-4">
          {/* Debug Panel - Remove this after debugging */}
          {demos.length === 0 && !dashboardApi.loading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Music className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
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

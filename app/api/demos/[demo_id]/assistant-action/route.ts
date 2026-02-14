import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Dropbox } from 'dropbox'
import { getDropboxClient, getValidAccessToken } from '@/lib/dropbox'
import { updateDemoStatusInCache, getDemoStatusFromCache } from '../../route'
import { getEmailService } from '@/lib/services/email'

// Demo metadata interface
interface DemoMetadata {
  artist_name: string
  track_title: string
  email: string
  full_name: string
  instagram_username: string | null
  beatport: string | null
  facebook: string | null
  x_twitter: string | null
  submitted_at: string
  demo_id: string
}

// Status folder mapping in Dropbox
const STATUS_FOLDERS = {
  submitted: '/demos/submitted',
  assistant_liked: '/demos/assistant_liked',
  rejected: '/demos/rejected',
  owner_liked: '/demos/owner_liked',
} as const

/**
 * Find demo file in a specific Dropbox folder by demo_id
 */
async function findDemoInFolder(
  dbx: Dropbox,
  folderPath: string,
  demoId: string
): Promise<{ mp3File: any; metadataFile: any } | null> {
  try {
    const response = await dbx.filesListFolder({ path: folderPath })
    const files = response.result.entries

    // Look for supported audio file that matches the demo_id pattern
    const audioFile = files.find(file =>
      file['.tag'] === 'file' &&
      (file.name.toLowerCase().endsWith('.mp3') || file.name.toLowerCase().endsWith('.wav')) &&
      file.name.includes(demoId)
    )

    if (!audioFile) {
      return null
    }

    // Find corresponding metadata file
    const metadataFileName = `${audioFile.name}.metadata.json`
    const metadataFile = files.find(file => file.name === metadataFileName)

    if (!metadataFile) {
      return null
    }

    return { mp3File: audioFile, metadataFile }
  } catch (error) {
    console.error(`Error searching folder ${folderPath}:`, error)
    return null
  }
}

/**
 * Move demo files between folders
 */
async function moveDemoFiles(
  dbx: Dropbox,
  sourceFolderPath: string,
  destinationFolderPath: string,
  mp3FileName: string,
  metadataFileName: string
): Promise<void> {
  const mp3SourcePath = `${sourceFolderPath}/${mp3FileName}`
  const mp3DestPath = `${destinationFolderPath}/${mp3FileName}`
  const metadataSourcePath = `${sourceFolderPath}/${metadataFileName}`
  const metadataDestPath = `${destinationFolderPath}/${metadataFileName}`

  // Move mp3 file
  await dbx.filesMoveV2({
    from_path: mp3SourcePath,
    to_path: mp3DestPath,
    autorename: false,
  })

  // Move metadata file
  await dbx.filesMoveV2({
    from_path: metadataSourcePath,
    to_path: metadataDestPath,
    autorename: false,
  })
}

/**
 * Fetch demo metadata from Dropbox
 */
async function fetchDemoMetadata(
  folderPath: string,
  metadataFileName: string
): Promise<DemoMetadata | null> {
  try {
    const metadataPath = `${folderPath}/${metadataFileName}`
    const accessToken = await getValidAccessToken()

    const downloadResponse = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path: metadataPath }),
      },
    })

    if (!downloadResponse.ok) {
      console.error(`Failed to download metadata: ${downloadResponse.status}`)
      return null
    }

    const metadataText = await downloadResponse.text()
    return JSON.parse(metadataText) as DemoMetadata
  } catch (error) {
    console.error('Error fetching demo metadata:', error)
    return null
  }
}

/**
 * Send email notification based on action type
 */
async function sendActionEmail(
  action: string,
  metadata: DemoMetadata,
  demoId: string
): Promise<{ sent: boolean; error?: string }> {
  const emailService = getEmailService()

  if (!emailService.isConfigured()) {
    console.warn('Email service not configured, skipping notification')
    return { sent: false, error: 'Email service not configured' }
  }

  try {
    let emailSent = false

    switch (action) {
      case 'like':
        // Assistant like - send liked notification
        emailSent = await emailService.sendDemoLikedNotification(
          metadata.email,
          metadata.artist_name,
          metadata.track_title,
          demoId
        )
        break
      case 'reject':
        // Rejection - send rejected notification
        emailSent = await emailService.sendDemoRejectedNotification(
          metadata.email,
          metadata.artist_name,
          metadata.track_title,
          demoId
        )
        break
      default:
        // No email for undo_reject
        return { sent: false, error: 'No email for this action type' }
    }

    return { sent: emailSent, error: emailSent ? undefined : 'Failed to send email' }
  } catch (error) {
    console.error('Error sending action email:', error)
    return { sent: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * POST /api/demos/[demo_id]/assistant-action
 * Handle assistant actions on demos
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ demo_id: string }> }
) {
  const startTime = Date.now()
  console.log(`\n🚀 [${new Date().toISOString()}] Assistant action started`)

  try {
    // Verify authentication
    const authStart = Date.now()
    const { userId } = await auth()
    console.log(`✓ Auth completed in ${Date.now() - authStart}ms`)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const paramsStart = Date.now()
    const { demo_id } = await params
    const body = await request.json()
    const { action } = body
    console.log(`✓ Params parsed in ${Date.now() - paramsStart}ms`)

    // Validate action
    const validActions = ['like', 'reject', 'undo_reject']
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be one of: like, reject, undo_reject' },
        { status: 400 }
      )
    }

    // Initialize Dropbox client
    const dbxStart = Date.now()
    const dbx = await getDropboxClient()
    console.log(`✓ Dropbox client initialized in ${Date.now() - dbxStart}ms`)

    // Determine source and destination folders based on action
    const folderDetermineStart = Date.now()
    let sourceFolderPath: string
    let destinationFolderPath: string
    let newStatus: string

    switch (action) {
      case 'like':
        sourceFolderPath = STATUS_FOLDERS.submitted
        destinationFolderPath = STATUS_FOLDERS.assistant_liked
        newStatus = 'assistant_liked'
        break
      case 'reject':
        // Use cache to determine current folder (fast!) instead of Dropbox API
        const cacheStart = Date.now()
        const currentStatus = await getDemoStatusFromCache(demo_id)
        console.log(`✓ Cache lookup completed in ${Date.now() - cacheStart}ms (status: ${currentStatus})`)

        if (currentStatus === 'submitted') {
          sourceFolderPath = STATUS_FOLDERS.submitted
        } else if (currentStatus === 'assistant_liked') {
          sourceFolderPath = STATUS_FOLDERS.assistant_liked
        } else {
          // Fallback: try both folders if cache miss
          console.log(`⚠️  Cache miss - falling back to Dropbox search`)
          const fallbackStart = Date.now()
          const demoInSubmitted = await findDemoInFolder(dbx, STATUS_FOLDERS.submitted, demo_id)
          console.log(`✓ Fallback search completed in ${Date.now() - fallbackStart}ms`)
          sourceFolderPath = demoInSubmitted ? STATUS_FOLDERS.submitted : STATUS_FOLDERS.assistant_liked
        }
        destinationFolderPath = STATUS_FOLDERS.rejected
        newStatus = 'rejected'
        break
      case 'undo_reject':
        sourceFolderPath = STATUS_FOLDERS.rejected
        destinationFolderPath = STATUS_FOLDERS.assistant_liked
        newStatus = 'assistant_liked'
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
    console.log(`✓ Folder determination completed in ${Date.now() - folderDetermineStart}ms`)

    // Find demo in source folder
    const findStart = Date.now()
    const demoFiles = await findDemoInFolder(dbx, sourceFolderPath, demo_id)
    console.log(`✓ findDemoInFolder completed in ${Date.now() - findStart}ms`)

    if (!demoFiles) {
      console.log(`❌ Demo not found - total time: ${Date.now() - startTime}ms`)
      return NextResponse.json(
        { error: `Demo not found in expected folder: ${sourceFolderPath}` },
        { status: 404 }
      )
    }

    // Move files to destination folder
    const moveStart = Date.now()
    await moveDemoFiles(
      dbx,
      sourceFolderPath,
      destinationFolderPath,
      demoFiles.mp3File.name,
      demoFiles.metadataFile.name
    )
    console.log(`✓ moveDemoFiles completed in ${Date.now() - moveStart}ms`)

    // Update cache in-place (fast!) instead of invalidating
    const cacheUpdateStart = Date.now()
    await updateDemoStatusInCache(demo_id, newStatus)
    console.log(`✓ Cache update completed in ${Date.now() - cacheUpdateStart}ms`)

    // Send email notification (non-blocking)
    let emailStatus: { sent: boolean; error?: string } = { sent: false, error: 'Email not attempted' }
    
    if (action === 'like' || action === 'reject') {
      const emailStart = Date.now()
      // Fetch metadata from the destination folder (files have been moved)
      const metadata = await fetchDemoMetadata(
        destinationFolderPath,
        demoFiles.metadataFile.name
      )
      
      if (metadata) {
        emailStatus = await sendActionEmail(action, metadata, demo_id)
        console.log(`✓ Email notification ${emailStatus.sent ? 'sent' : 'failed'} in ${Date.now() - emailStart}ms`)
      } else {
        emailStatus = { sent: false, error: 'Could not fetch demo metadata' }
        console.log(`⚠️  Could not fetch metadata for email notification`)
      }
    }

    console.log(`✅ Total request time: ${Date.now() - startTime}ms\n`)

    return NextResponse.json({
      message: `Successfully performed ${action} on demo`,
      demo_id,
      action,
      email_status: {
        notification_sent: emailStatus.sent,
        error: emailStatus.error || null,
      },
    })
  } catch (error) {
    console.error(`❌ Error after ${Date.now() - startTime}ms:`, error)

    return NextResponse.json(
      {
        error: 'Failed to perform action on demo',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

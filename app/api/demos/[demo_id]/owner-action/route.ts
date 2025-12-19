import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Dropbox } from 'dropbox'
import { getDropboxClient } from '@/lib/dropbox'
import { updateDemoStatusInCache, getDemoStatusFromCache } from '../../route'

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

    // Look for mp3 file that matches the demo_id pattern
    const mp3File = files.find(file =>
      file['.tag'] === 'file' &&
      file.name.endsWith('.mp3') &&
      file.name.includes(demoId)
    )

    if (!mp3File) {
      return null
    }

    // Find corresponding metadata file
    const metadataFileName = `${mp3File.name}.metadata.json`
    const metadataFile = files.find(file => file.name === metadataFileName)

    if (!metadataFile) {
      return null
    }

    return { mp3File, metadataFile }
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
 * POST /api/demos/[demo_id]/owner-action
 * Handle owner/admin actions on demos
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ demo_id: string }> }
) {
  const startTime = Date.now()
  console.log(`\n🚀 [${new Date().toISOString()}] Owner action started`)

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

    // Any authenticated user can perform owner actions when viewing as Label Owner
    // Role is managed client-side via the role switcher

    const paramsStart = Date.now()
    const { demo_id } = await params
    const body = await request.json()
    const { action } = body
    console.log(`✓ Params parsed in ${Date.now() - paramsStart}ms`)

    // Validate action
    const validActions = ['approve', 'reject', 'undo_reject', 'like']
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be one of: approve, reject, undo_reject, like' },
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
      case 'approve':
        sourceFolderPath = STATUS_FOLDERS.assistant_liked
        destinationFolderPath = STATUS_FOLDERS.owner_liked
        newStatus = 'owner_liked'
        break
      case 'like':
        // Owner can like from submitted folder (same as assistant)
        sourceFolderPath = STATUS_FOLDERS.submitted
        destinationFolderPath = STATUS_FOLDERS.assistant_liked
        newStatus = 'assistant_liked'
        break
      case 'reject':
        // Use cache to determine current folder (fast!) instead of Dropbox API
        const cacheStart = Date.now()
        const currentStatus = await getDemoStatusFromCache(demo_id)
        console.log(`✓ Cache lookup completed in ${Date.now() - cacheStart}ms (status: ${currentStatus})`)

        if (currentStatus === 'assistant_liked') {
          sourceFolderPath = STATUS_FOLDERS.assistant_liked
        } else if (currentStatus === 'submitted') {
          sourceFolderPath = STATUS_FOLDERS.submitted
        } else {
          // Fallback: try both folders if cache miss
          console.log(`⚠️  Cache miss - falling back to Dropbox search`)
          const fallbackStart = Date.now()
          const demoInAssistantLiked = await findDemoInFolder(dbx, STATUS_FOLDERS.assistant_liked, demo_id)
          console.log(`✓ Fallback search completed in ${Date.now() - fallbackStart}ms`)
          sourceFolderPath = demoInAssistantLiked ? STATUS_FOLDERS.assistant_liked : STATUS_FOLDERS.submitted
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

    console.log(`✅ Total request time: ${Date.now() - startTime}ms\n`)

    return NextResponse.json({
      message: `Successfully performed ${action} on demo`,
      demo_id,
      action,
    })
  } catch (error) {
    console.error('Error in POST /api/demos/[demo_id]/owner-action:', error)

    return NextResponse.json(
      {
        error: 'Failed to perform action on demo',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Dropbox } from 'dropbox'
import { redis, CACHE_KEYS, CACHE_TTL } from '@/lib/redis'
import { getDropboxClient, getValidAccessToken } from '@/lib/dropbox'

// Status folder mapping in Dropbox
const STATUS_FOLDERS = {
  submitted: '/demos/submitted',
  assistant_liked: '/demos/assistant_liked',
  rejected: '/demos/rejected',
  owner_liked: '/demos/owner_liked',
} as const

// Cache for demos with folder state tracking
interface DemoCache {
  demos: Demo[]
  folderHashes: Record<string, string> // folder path -> hash of contents
  timestamp: number
}

/**
 * Invalidate the demos cache (called when demos are moved between folders)
 */
export async function invalidateDemosCache() {
  await redis.del(CACHE_KEYS.DEMOS)
}

/**
 * Get the current status of a demo from cache (fast lookup)
 */
export async function getDemoStatusFromCache(demoId: string): Promise<string | null> {
  try {
    const cache = await redis.get<DemoCache>(CACHE_KEYS.DEMOS)
    if (!cache) return null

    const demo = cache.demos.find(d => d.demo_id === demoId)
    return demo?.status || null
  } catch (error) {
    console.error('Failed to get demo status from cache:', error)
    return null
  }
}

/**
 * Update a single demo's status in the cache without refetching from Dropbox
 * This provides instant cache updates after demo actions
 * Also refreshes folder hashes to prevent cache invalidation on next GET
 */
export async function updateDemoStatusInCache(demoId: string, newStatus: string) {
  try {
    const cache = await redis.get<DemoCache>(CACHE_KEYS.DEMOS)

    if (!cache) {
      // No cache exists, nothing to update
      return
    }

    // Find and update the demo's status
    const demoIndex = cache.demos.findIndex(demo => demo.demo_id === demoId)

    if (demoIndex !== -1) {
      cache.demos[demoIndex].status = newStatus

      // Refresh folder hashes after moving files to prevent cache invalidation
      // This allows the next GET request to use cached data
      const dbx = await getDropboxClient()
      const updatedFolderHashes: Record<string, string> = {}

      for (const [statusName, folderPath] of Object.entries(STATUS_FOLDERS)) {
        try {
          const folderContents = await dbx.filesListFolder({ path: folderPath })
          updatedFolderHashes[folderPath] = generateFolderHash(folderContents.result.entries)
        } catch (error) {
          console.error(`Error updating hash for ${folderPath}:`, error)
          // Keep old hash if update fails
          updatedFolderHashes[folderPath] = cache.folderHashes[folderPath] || ''
        }
      }

      cache.folderHashes = updatedFolderHashes

      // Save updated cache back to Redis with same TTL
      await redis.set(CACHE_KEYS.DEMOS, cache, { ex: CACHE_TTL.DEMOS })

      console.log(`✓ Updated demo ${demoId} status to ${newStatus} in cache`)
    }
  } catch (error) {
    console.error('Failed to update demo status in cache:', error)
    // Don't throw - cache update is optional optimization
  }
}

/**
 * Generate a hash for folder contents to detect changes
 */
function generateFolderHash(files: any[]): string {
  // Create a string of all file names and their modified times
  const fileSignature = files
    .filter(f => f['.tag'] === 'file')
    .map(f => `${f.name}:${f.server_modified || ''}`)
    .sort()
    .join('|')

  // Simple hash function
  let hash = 0
  for (let i = 0; i < fileSignature.length; i++) {
    const char = fileSignature.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(36)
}

// Type definitions
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

interface Demo {
  demo_id: string
  track_title: string
  artist_name: string
  shared_link: string
  submitted_at: string
  status: string
  email: string
}

/**
 * Parse submitted_at timestamp from YYYYMMDD_HHMMSS to DD/MM/YYYY
 */
function formatSubmittedAt(timestamp: string): string {
  try {
    // Format: "20251103_204041" -> "03/11/2025"
    if (timestamp.length === 15 && timestamp.includes('_')) {
      const [datePart] = timestamp.split('_')
      const year = datePart.substring(0, 4)
      const month = datePart.substring(4, 6)
      const day = datePart.substring(6, 8)

      return `${day}/${month}/${year}`
    }

    // Fallback to original if format is unexpected
    return timestamp
  } catch (error) {
    console.error('Error formatting submitted_at:', error)
    return timestamp
  }
}

/**
 * Parse submitted_at timestamp to sortable date
 */
function parseSubmittedAtForSort(timestamp: string): Date {
  try {
    // Format: "20251103_204041" -> Date object
    if (timestamp.length === 15 && timestamp.includes('_')) {
      const [datePart, timePart] = timestamp.split('_')
      const year = datePart.substring(0, 4)
      const month = datePart.substring(4, 6)
      const day = datePart.substring(6, 8)
      const hour = timePart.substring(0, 2)
      const minute = timePart.substring(2, 4)
      const second = timePart.substring(4, 6)

      return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`)
    }

    // Fallback to standard date parsing
    return new Date(timestamp)
  } catch (error) {
    console.error('Error parsing submitted_at for sort:', error)
    return new Date() // Return current date as fallback
  }
}

/**
 * Fetch demos from a specific Dropbox folder
 */
async function fetchDemosFromFolder(
  dbx: Dropbox,
  folderPath: string,
  status: string
): Promise<Demo[]> {
  try {
    // List all files in the folder
    const response = await dbx.filesListFolder({ path: folderPath })
    const files = response.result.entries

    // Separate .mp3 files and .metadata.json files
    const mp3Files = files.filter(file =>
      file['.tag'] === 'file' && file.name.endsWith('.mp3')
    )

    const demos: Demo[] = []

    // Process each mp3 file
    for (const mp3File of mp3Files) {
      // Metadata file naming: "trackname.mp3.metadata.json" (not "trackname.metadata.json")
      const metadataFileName = `${mp3File.name}.metadata.json`
      const metadataFile = files.find(file => file.name === metadataFileName)

      if (!metadataFile || metadataFile['.tag'] !== 'file') {
        console.warn(`Metadata file not found for ${mp3File.name}`)
        continue
      }

      try {
        // Download metadata file using direct Dropbox API call
        // This approach works better with Next.js fetch
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
          console.error(`Failed to download ${metadataFileName}: ${downloadResponse.status}`)
          continue
        }

        const metadataText = await downloadResponse.text()
        const metadata: DemoMetadata = JSON.parse(metadataText)

        // Create demo object with formatted date for display
        // We'll generate the shared link later in parallel
        const demo: Demo = {
          demo_id: metadata.demo_id,
          track_title: metadata.track_title,
          artist_name: metadata.artist_name,
          email: metadata.email,
          submitted_at: formatSubmittedAt(metadata.submitted_at), // Format for display
          status,
          shared_link: '', // Will be populated below
        }

        // Store the file path for later link generation
        ;(demo as any)._filePath = `${folderPath}/${mp3File.name}`
        ;(demo as any)._sortTimestamp = metadata.submitted_at

        demos.push(demo)
      } catch (error) {
        console.error(`Error processing demo ${mp3File.name}:`, error)
      }
    }

    // Generate shared links in parallel for all demos (much faster!)
    await Promise.all(
      demos.map(async (demo) => {
        const filePath = (demo as any)._filePath
        if (!filePath) return

        try {
          // Try to get existing shared link first (faster)
          const existingLinks = await dbx.sharingListSharedLinks({ path: filePath })

          if (existingLinks.result.links.length > 0) {
            // Convert to direct download link for audio playback
            const url = existingLinks.result.links[0].url
            // Change www.dropbox.com to dl.dropboxusercontent.com and remove ?dl=0
            demo.shared_link = url
              .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
              .replace('?dl=0', '')
              .replace('?dl=1', '')
          } else {
            // Create new shared link if none exists
            const linkResponse = await dbx.sharingCreateSharedLinkWithSettings({
              path: filePath,
              settings: { requested_visibility: { '.tag': 'public' } }
            })
            const url = linkResponse.result.url
            // Convert to direct download link for audio playback
            demo.shared_link = url
              .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
              .replace('?dl=0', '')
              .replace('?dl=1', '')
          }
        } catch (error: any) {
          // Fallback: use temporary link (these work directly in audio players)
          try {
            const tempLink = await dbx.filesGetTemporaryLink({ path: filePath })
            demo.shared_link = tempLink.result.link
          } catch (tempError) {
            console.error(`Failed to create temp link for ${filePath}:`, tempError)
          }
        }

        // Clean up temporary properties
        delete (demo as any)._filePath
      })
    )

    return demos
  } catch (error) {
    console.error(`Error fetching demos from ${folderPath}:`, error)
    throw error
  }
}

/**
 * GET /api/demos
 * Fetch all demos from Dropbox with pagination and sorting
 */
export async function GET(request: NextRequest) {
  try {
    // TEMPORARILY COMMENTED OUT FOR TESTING - UNCOMMENT TO RE-ENABLE CLERK AUTH
    /* CLERK AUTH CODE - UNCOMMENT TO RE-ENABLE
    // Verify authentication with Clerk
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    */

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '50')

    // Initialize Dropbox client
    const dbx = await getDropboxClient()

    // Check if folders have changed by getting folder metadata
    const currentFolderHashes: Record<string, string> = {}
    let foldersChanged = false

    // Get cached demos from Redis
    const demosCache = await redis.get<DemoCache>(CACHE_KEYS.DEMOS)

    // Check each folder for changes
    for (const [statusName, folderPath] of Object.entries(STATUS_FOLDERS)) {
      try {
        const folderContents = await dbx.filesListFolder({ path: folderPath })
        const folderHash = generateFolderHash(folderContents.result.entries)
        currentFolderHashes[folderPath] = folderHash

        // Compare with cached hash
        if (!demosCache || demosCache.folderHashes[folderPath] !== folderHash) {
          foldersChanged = true
        }
      } catch (error) {
        console.error(`Error checking folder ${folderPath}:`, error)
        foldersChanged = true // Force refresh on error
      }
    }

    // Check if cache is still valid (15 minutes in milliseconds)
    const CACHE_DURATION = 15 * 60 * 1000
    const cacheExpired = !demosCache || (Date.now() - demosCache.timestamp > CACHE_DURATION)

    // Use cache if available and valid
    if (demosCache && !foldersChanged && !cacheExpired) {
      const allDemos = demosCache.demos

      // Apply pagination to cached data
      const startIndex = (page - 1) * perPage
      const endIndex = startIndex + perPage
      const paginatedDemos = allDemos.slice(startIndex, endIndex)

      return NextResponse.json({
        status: 'success',
        count: allDemos.length,
        demos: paginatedDemos,
        cached: true,
        pagination: {
          page,
          per_page: perPage,
          total: allDemos.length,
          total_pages: Math.ceil(allDemos.length / perPage),
          has_next: endIndex < allDemos.length,
          has_prev: page > 1,
        }
      })
    }

    // Fetch demos from all folders in parallel
    const [submittedDemos, assistantLikedDemos, rejectedDemos, ownerLikedDemos] =
      await Promise.allSettled([
        fetchDemosFromFolder(dbx, STATUS_FOLDERS.submitted, 'submitted'),
        fetchDemosFromFolder(dbx, STATUS_FOLDERS.assistant_liked, 'assistant_liked'),
        fetchDemosFromFolder(dbx, STATUS_FOLDERS.rejected, 'rejected'),
        fetchDemosFromFolder(dbx, STATUS_FOLDERS.owner_liked, 'owner_liked'),
      ])

    // Combine all demos, handling any errors
    const allDemos: Demo[] = []

    if (submittedDemos.status === 'fulfilled') {
      allDemos.push(...submittedDemos.value)
    } else {
      console.error('Error fetching submitted demos:', submittedDemos.reason)
    }

    if (assistantLikedDemos.status === 'fulfilled') {
      allDemos.push(...assistantLikedDemos.value)
    } else {
      console.error('Error fetching assistant_liked demos:', assistantLikedDemos.reason)
    }

    if (rejectedDemos.status === 'fulfilled') {
      allDemos.push(...rejectedDemos.value)
    } else {
      console.error('Error fetching rejected demos:', rejectedDemos.reason)
    }

    if (ownerLikedDemos.status === 'fulfilled') {
      allDemos.push(...ownerLikedDemos.value)
    } else {
      console.error('Error fetching owner_liked demos:', ownerLikedDemos.reason)
    }

    // Sort by submission date (newest first) using original timestamp
    allDemos.sort((a, b) => {
      const dateA = parseSubmittedAtForSort((a as any)._sortTimestamp || a.submitted_at)
      const dateB = parseSubmittedAtForSort((b as any)._sortTimestamp || b.submitted_at)
      return dateB.getTime() - dateA.getTime()
    })

    // Remove temporary sort timestamp
    allDemos.forEach(demo => {
      delete (demo as any)._sortTimestamp
    })

    // Update cache with fresh data in Redis
    const newCache: DemoCache = {
      demos: allDemos,
      folderHashes: currentFolderHashes,
      timestamp: Date.now()
    }
    await redis.set(CACHE_KEYS.DEMOS, newCache, { ex: CACHE_TTL.DEMOS })

    // Apply pagination
    const startIndex = (page - 1) * perPage
    const endIndex = startIndex + perPage
    const paginatedDemos = allDemos.slice(startIndex, endIndex)

    // Return response matching the expected format
    return NextResponse.json({
      status: 'success',
      count: allDemos.length,
      demos: paginatedDemos,
      pagination: {
        page,
        per_page: perPage,
        total: allDemos.length,
        total_pages: Math.ceil(allDemos.length / perPage),
        has_next: endIndex < allDemos.length,
        has_prev: page > 1,
      }
    })
  } catch (error) {
    console.error('❌ Error in GET /api/demos:', error)
    console.error('  Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('  Error message:', error instanceof Error ? error.message : String(error))
    if (error instanceof Error && error.stack) {
      console.error('  Stack trace:', error.stack)
    }
    if (error instanceof Error && 'cause' in error) {
      console.error('  Cause:', (error as any).cause)
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch demos',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

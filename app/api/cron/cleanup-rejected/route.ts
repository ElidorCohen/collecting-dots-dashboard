import { NextRequest, NextResponse } from 'next/server'
import type { files } from 'dropbox'
import { getDropboxClient } from '@/lib/dropbox'
import { invalidateDemosCache } from '@/app/api/demos/route'

const REJECTED_FOLDER_PATH = '/demos/rejected'
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000
const MAX_ERROR_DETAILS = 20
const MAX_DEBUG_FILE_LOGS = 30

function isAuthorizedCronRequest(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false

  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

async function listAllRejectedFiles() {
  const dbx = await getDropboxClient()
  const allEntries: files.MetadataReference[] = []

  let response = await dbx.filesListFolder({ path: REJECTED_FOLDER_PATH })
  allEntries.push(...response.result.entries)

  while (response.result.has_more) {
    response = await dbx.filesListFolderContinue({
      cursor: response.result.cursor,
    })
    allEntries.push(...response.result.entries)
  }

  return { dbx, entries: allEntries }
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  const staleThreshold = now - CLEANUP_INTERVAL_MS

  let scanned = 0
  let deleted = 0
  let failed = 0
  let missingServerModified = 0
  const errors: Array<{ path: string; message: string }> = []

  try {
    const { dbx, entries } = await listAllRejectedFiles()
    const fileEntries = entries.filter(
      (entry): entry is files.FileMetadataReference => entry['.tag'] === 'file'
    )
    scanned = fileEntries.length
    const fileDiagnostics = fileEntries.map((fileEntry) => {
      const serverModifiedIso = fileEntry.server_modified || null
      const serverModifiedTs = serverModifiedIso ? new Date(serverModifiedIso).getTime() : null
      const ageHours = serverModifiedTs ? Number(((now - serverModifiedTs) / (60 * 60 * 1000)).toFixed(2)) : null
      const stale = serverModifiedTs !== null && serverModifiedTs <= staleThreshold

      if (!serverModifiedIso) {
        missingServerModified += 1
      }

      return {
        name: fileEntry.name,
        path: fileEntry.path_display || fileEntry.path_lower || fileEntry.name,
        server_modified: serverModifiedIso,
        client_modified: fileEntry.client_modified || null,
        age_hours_from_server_modified: ageHours,
        stale,
      }
    })
    const staleFiles = fileEntries.filter((fileEntry) => {
      if (!fileEntry.server_modified) return false
      return new Date(fileEntry.server_modified).getTime() <= staleThreshold
    })

    const staleAgeHours = fileDiagnostics
      .map((item) => item.age_hours_from_server_modified)
      .filter((value): value is number => value !== null)
    const oldestAgeHours = staleAgeHours.length ? Math.max(...staleAgeHours) : null
    const youngestAgeHours = staleAgeHours.length ? Math.min(...staleAgeHours) : null

    console.log('Dropbox rejected cleanup file diagnostics:', {
      folder: REJECTED_FOLDER_PATH,
      now_iso: new Date(now).toISOString(),
      threshold_iso: new Date(staleThreshold).toISOString(),
      scanned,
      missing_server_modified: missingServerModified,
      oldest_age_hours: oldestAgeHours,
      youngest_age_hours: youngestAgeHours,
      files_logged: Math.min(fileDiagnostics.length, MAX_DEBUG_FILE_LOGS),
      files: fileDiagnostics.slice(0, MAX_DEBUG_FILE_LOGS),
      files_truncated: fileDiagnostics.length > MAX_DEBUG_FILE_LOGS,
    })

    for (const fileEntry of staleFiles) {
      const filePath = fileEntry.path_lower || fileEntry.path_display || fileEntry.name

      if (!filePath) {
        failed += 1
        if (errors.length < MAX_ERROR_DETAILS) {
          errors.push({ path: 'unknown', message: 'Missing path for Dropbox entry' })
        }
        continue
      }

      try {
        await dbx.filesDeleteV2({ path: filePath })
        deleted += 1
      } catch (error) {
        failed += 1
        if (errors.length < MAX_ERROR_DETAILS) {
          errors.push({
            path: filePath,
            message: error instanceof Error ? error.message : 'Unknown delete error',
          })
        }
      }
    }

    if (deleted > 0) {
      await invalidateDemosCache()
    }

    const summary = {
      status: 'success',
      folder: REJECTED_FOLDER_PATH,
      scanned,
      stale_candidates: staleFiles.length,
      deleted,
      failed,
      missing_server_modified: missingServerModified,
      threshold_iso: new Date(staleThreshold).toISOString(),
      errors,
    }

    console.log('Dropbox rejected cleanup summary:', summary)
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Dropbox rejected cleanup failed:', error)
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown cleanup error',
        scanned,
        deleted,
        failed,
        errors,
      },
      { status: 500 }
    )
  }
}

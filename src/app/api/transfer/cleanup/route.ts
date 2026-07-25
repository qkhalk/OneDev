import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { deleteFile, deleteChunkDir } from '@/lib/transfer/storage'

// POST /api/transfer/cleanup — delete expired files (for cron jobs)
export async function POST(req: NextRequest) {
  try {
    // Optional: verify API key or secret for cron protection
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const now = new Date()

    // Find all expired files
    const expiredFiles = await prisma.transferFile.findMany({
      where: {
        AND: [
          { expiresAt: { not: null } },
          { expiresAt: { lt: now } },
          { status: { not: 'expired' } },
        ],
      },
    })

    let deletedCount = 0
    let cleanedFromDisk = 0
    const errors: string[] = []

    for (const file of expiredFiles) {
      try {
        // Delete from disk
        if (file.status === 'completed') {
          await deleteFile(file.id, file.filename)
          cleanedFromDisk++
        } else if (file.status === 'uploading') {
          await deleteChunkDir(file.uploadId)
          cleanedFromDisk++
        }

        // Mark as expired in DB (keep record, or delete entirely)
        // Option 1: Mark as expired
        await prisma.transferFile.update({
          where: { id: file.id },
          data: { status: 'expired' },
        })
        deletedCount++
      } catch (err) {
        errors.push(`Failed to clean file ${file.id}: ${err}`)
      }
    }

    // Also clean up stale upload sessions (older than 24 hours, still uploading)
    const staleThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const staleUploads = await prisma.transferFile.findMany({
      where: {
        status: 'uploading',
        createdAt: { lt: staleThreshold },
      },
    })

    for (const file of staleUploads) {
      try {
        await deleteChunkDir(file.uploadId)
        await prisma.transferFile.delete({
          where: { id: file.id },
        })
        deletedCount++
        cleanedFromDisk++
      } catch (err) {
        errors.push(`Failed to clean stale upload ${file.id}: ${err}`)
      }
    }

    return NextResponse.json({
      success: true,
      expiredCount: expiredFiles.length,
      staleUploadCount: staleUploads.length,
      deletedCount,
      cleanedFromDisk,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('[POST /api/transfer/cleanup]', error)
    return NextResponse.json(
      { error: 'Failed to run cleanup' },
      { status: 500 }
    )
  }
}

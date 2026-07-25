import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { deleteFile, deleteChunkDir } from '@/lib/transfer/storage'

// GET /api/transfer/[id] — get file info
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const transferFile = await prisma.transferFile.findUnique({
      where: { id },
    })

    if (!transferFile) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Check if expired
    let isExpired = false
    if (transferFile.expiresAt && transferFile.expiresAt.getTime() < Date.now()) {
      isExpired = true
    }

    // Check if max downloads reached
    let maxDownloadsReached = false
    if (
      transferFile.maxDownloads > 0 &&
      transferFile.downloadCount >= transferFile.maxDownloads
    ) {
      maxDownloadsReached = true
    }

    return NextResponse.json({
      file: {
        id: transferFile.id,
        filename: transferFile.filename,
        fileSize: transferFile.fileSize,
        mimeType: transferFile.mimeType,
        status: transferFile.status,
        chunks: transferFile.chunks,
        uploadedChunks: transferFile.uploadedChunks,
        hasPassword: !!transferFile.password,
        maxDownloads: transferFile.maxDownloads,
        downloadCount: transferFile.downloadCount,
        expiresAt: transferFile.expiresAt,
        createdAt: transferFile.createdAt,
        destination: transferFile.destination,
        isExpired,
        maxDownloadsReached,
        downloadUrl: `/api/transfer/${transferFile.id}/download`,
      },
    })
  } catch (error) {
    console.error('[GET /api/transfer/[id]]', error)
    return NextResponse.json(
      { error: 'Failed to fetch file info' },
      { status: 500 }
    )
  }
}

// DELETE /api/transfer/[id] — delete a file
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const transferFile = await prisma.transferFile.findUnique({
      where: { id },
    })

    if (!transferFile) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Delete file from disk
    if (transferFile.status === 'completed') {
      await deleteFile(transferFile.id, transferFile.filename)
    }

    // Clean up chunk directory if still uploading
    if (transferFile.status === 'uploading') {
      await deleteChunkDir(transferFile.uploadId)
    }

    // Delete from database
    await prisma.transferFile.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'File deleted' })
  } catch (error) {
    console.error('[DELETE /api/transfer/[id]]', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}

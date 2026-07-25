import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { DEFAULT_CHUNK_SIZE, MAX_FILE_SIZE } from '@/lib/transfer/storage'

// POST /api/transfer/init — initialize an upload session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      filename,
      fileSize,
      mimeType,
      chunkSize,
      password,
      expiresAt,
      maxDownloads,
      destination,
    } = body as {
      filename?: string
      fileSize?: number
      mimeType?: string
      chunkSize?: number
      password?: string
      expiresAt?: string
      maxDownloads?: number
      destination?: string
    }

    // Validate required fields
    if (!filename || typeof filename !== 'string' || filename.trim().length === 0) {
      return NextResponse.json(
        { error: 'filename is required' },
        { status: 400 }
      )
    }

    if (!fileSize || typeof fileSize !== 'number' || fileSize <= 0) {
      return NextResponse.json(
        { error: 'fileSize must be a positive number' },
        { status: 400 }
      )
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed (${MAX_FILE_SIZE} bytes / 2GB)` },
        { status: 413 }
      )
    }

    if (!mimeType || typeof mimeType !== 'string') {
      return NextResponse.json(
        { error: 'mimeType is required' },
        { status: 400 }
      )
    }

    // Validate chunkSize if provided
    const effectiveChunkSize = chunkSize && chunkSize > 0 ? chunkSize : DEFAULT_CHUNK_SIZE
    if (effectiveChunkSize > fileSize) {
      // chunkSize can't be larger than file
      // will result in 1 chunk
    }

    // Parse expiry
    let parsedExpiresAt: Date | null = null
    if (expiresAt) {
      const d = new Date(expiresAt)
      if (isNaN(d.getTime())) {
        return NextResponse.json(
          { error: 'Invalid expiresAt date' },
          { status: 400 }
        )
      }
      if (d.getTime() < Date.now()) {
        return NextResponse.json(
          { error: 'Expiry date must be in the future' },
          { status: 400 }
        )
      }
      parsedExpiresAt = d
    }

    // Calculate total chunks
    const totalChunks = Math.ceil(fileSize / effectiveChunkSize)

    // Generate uploadId
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    // Create TransferFile record
    const transferFile = await prisma.transferFile.create({
      data: {
        filename: filename.trim(),
        fileSize,
        mimeType,
        uploadId,
        chunks: totalChunks,
        uploadedChunks: 0,
        status: 'uploading',
        password: password || null,
        maxDownloads: maxDownloads ?? 0,
        downloadCount: 0,
        expiresAt: parsedExpiresAt,
        destination: destination || null,
      },
    })

    return NextResponse.json(
      {
        uploadId: transferFile.uploadId,
        fileId: transferFile.id,
        chunkSize: effectiveChunkSize,
        totalChunks,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/transfer/init]', error)
    return NextResponse.json(
      { error: 'Failed to initialize upload session' },
      { status: 500 }
    )
  }
}

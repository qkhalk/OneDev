import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { saveChunk, mergeChunks } from '@/lib/transfer/storage'

// POST /api/transfer/upload — upload a single chunk
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { uploadId, chunkIndex, data } = body as {
      uploadId?: string
      chunkIndex?: number
      data?: string
    }

    // Validate
    if (!uploadId || typeof uploadId !== 'string') {
      return NextResponse.json(
        { error: 'uploadId is required' },
        { status: 400 }
      )
    }

    if (chunkIndex === undefined || typeof chunkIndex !== 'number' || chunkIndex < 0) {
      return NextResponse.json(
        { error: 'chunkIndex must be a non-negative number' },
        { status: 400 }
      )
    }

    if (!data || typeof data !== 'string') {
      return NextResponse.json(
        { error: 'data (base64) is required' },
        { status: 400 }
      )
    }

    // Find the upload session
    const transferFile = await prisma.transferFile.findUnique({
      where: { uploadId },
    })

    if (!transferFile) {
      return NextResponse.json(
        { error: 'Upload session not found' },
        { status: 404 }
      )
    }

    if (transferFile.status !== 'uploading') {
      return NextResponse.json(
        { error: `Upload session is ${transferFile.status}, cannot upload chunks` },
        { status: 400 }
      )
    }

    if (chunkIndex >= transferFile.chunks) {
      return NextResponse.json(
        { error: `chunkIndex ${chunkIndex} out of range (total: ${transferFile.chunks})` },
        { status: 400 }
      )
    }

    // Decode base64 data
    let chunkBuffer: Buffer
    try {
      chunkBuffer = Buffer.from(data, 'base64')
    } catch {
      return NextResponse.json(
        { error: 'Invalid base64 data' },
        { status: 400 }
      )
    }

    // Save chunk to disk
    await saveChunk(uploadId, chunkIndex, chunkBuffer)

    // Increment uploadedChunks
    const updated = await prisma.transferFile.update({
      where: { uploadId },
      data: {
        uploadedChunks: { increment: 1 },
      },
    })

    const completed = updated.uploadedChunks >= transferFile.chunks

    // If all chunks uploaded, merge them
    if (completed) {
      try {
        await mergeChunks(
          uploadId,
          transferFile.chunks,
          transferFile.id,
          transferFile.filename
        )

        await prisma.transferFile.update({
          where: { uploadId },
          data: { status: 'completed' },
        })
      } catch (mergeError) {
        console.error('[Merge error]', mergeError)
        await prisma.transferFile.update({
          where: { uploadId },
          data: { status: 'uploading' },
        })
        return NextResponse.json(
          { error: 'Failed to merge chunks' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      uploadedChunks: updated.uploadedChunks,
      totalChunks: transferFile.chunks,
      completed,
    })
  } catch (error) {
    console.error('[POST /api/transfer/upload]', error)
    return NextResponse.json(
      { error: 'Failed to upload chunk' },
      { status: 500 }
    )
  }
}

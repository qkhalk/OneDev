import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/transfer/list — list all transfer files with pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') // uploading | completed | expired
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // Validate pagination
    const validPage = Math.max(1, page)
    const validLimit = Math.min(100, Math.max(1, limit))
    const skip = (validPage - 1) * validLimit

    // Build where clause
    const where: { status?: string } = {}
    if (status && ['uploading', 'completed', 'expired'].includes(status)) {
      where.status = status
    }

    // Fetch files
    const [files, total] = await Promise.all([
      prisma.transferFile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: validLimit,
      }),
      prisma.transferFile.count({ where }),
    ])

    // Transform — don't expose password hash
    const sanitizedFiles = files.map((f) => ({
      id: f.id,
      filename: f.filename,
      fileSize: f.fileSize,
      mimeType: f.mimeType,
      status: f.status,
      chunks: f.chunks,
      uploadedChunks: f.uploadedChunks,
      hasPassword: !!f.password,
      maxDownloads: f.maxDownloads,
      downloadCount: f.downloadCount,
      expiresAt: f.expiresAt,
      createdAt: f.createdAt,
      destination: f.destination,
    }))

    return NextResponse.json({
      files: sanitizedFiles,
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        totalPages: Math.ceil(total / validLimit),
      },
    })
  } catch (error) {
    console.error('[GET /api/transfer/list]', error)
    return NextResponse.json(
      { error: 'Failed to fetch file list' },
      { status: 500 }
    )
  }
}

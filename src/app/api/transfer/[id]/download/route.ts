import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getFileStats } from '@/lib/transfer/storage'
import { readFile } from 'fs/promises'

// GET /api/transfer/[id]/download — download file
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

    // Check if upload is completed
    if (transferFile.status !== 'completed') {
      return NextResponse.json(
        { error: 'File is not ready for download (still uploading or expired)' },
        { status: 400 }
      )
    }

    // Check expiry
    if (transferFile.expiresAt && transferFile.expiresAt.getTime() < Date.now()) {
      // Mark as expired
      await prisma.transferFile.update({
        where: { id },
        data: { status: 'expired' },
      })
      return NextResponse.json(
        { error: 'File has expired' },
        { status: 410 }
      )
    }

    // Check max downloads
    if (
      transferFile.maxDownloads > 0 &&
      transferFile.downloadCount >= transferFile.maxDownloads
    ) {
      return NextResponse.json(
        { error: 'Maximum download limit reached' },
        { status: 403 }
      )
    }

    // Check password
    if (transferFile.password) {
      const url = new URL(req.url)
      const password =
        req.headers.get('x-password') || url.searchParams.get('password')

      if (!password || password !== transferFile.password) {
        return NextResponse.json(
          { error: 'Password required or incorrect' },
          { status: 401 }
        )
      }
    }

    // Verify file exists on disk
    const stats = await getFileStats(transferFile.id, transferFile.filename)
    if (!stats) {
      return NextResponse.json(
        { error: 'File not found on disk' },
        { status: 404 }
      )
    }

    // Increment download count
    await prisma.transferFile.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    })

    // Read file and return as stream
    const fileBuffer = await readFile(stats.path)

    // Encode filename for Content-Disposition header
    const encodedFilename = encodeURIComponent(transferFile.filename)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': transferFile.mimeType || 'application/octet-stream',
        'Content-Length': stats.size.toString(),
        'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[GET /api/transfer/[id]/download]', error)
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    )
  }
}

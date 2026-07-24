import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateUrl, validateAlias } from '@/lib/shortener'

// GET /api/shortener/:id — get link detail + stats summary
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const link = await prisma.shortLink.findUnique({
      where: { id },
      include: {
        visits: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    })

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    return NextResponse.json({ link })
  } catch (error) {
    console.error('[GET /api/shortener/:id]', error)
    return NextResponse.json(
      { error: 'Failed to fetch link' },
      { status: 500 }
    )
  }
}

// PATCH /api/shortener/:id — update link
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { originalUrl, customAlias, password, expiresAt } = body as {
      originalUrl?: string
      customAlias?: string
      password?: string
      expiresAt?: string | null
    }

    const existing = await prisma.shortLink.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (originalUrl !== undefined) {
      if (!validateUrl(originalUrl)) {
        return NextResponse.json(
          { error: 'Invalid URL. Must start with http:// or https://' },
          { status: 400 }
        )
      }
      updateData.originalUrl = originalUrl
    }

    if (customAlias !== undefined) {
      if (!validateAlias(customAlias)) {
        return NextResponse.json(
          { error: 'Custom alias must be 2-50 chars, only letters, numbers, hyphens, underscores' },
          { status: 400 }
        )
      }
      if (customAlias !== existing.alias) {
        const conflict = await prisma.shortLink.findUnique({ where: { alias: customAlias } })
        if (conflict) {
          return NextResponse.json({ error: 'Alias already taken' }, { status: 409 })
        }
      }
      updateData.alias = customAlias
    }

    if (password !== undefined) {
      updateData.password = password || null
    }

    if (expiresAt !== undefined) {
      if (expiresAt === null) {
        updateData.expiresAt = null
      } else {
        const d = new Date(expiresAt)
        if (isNaN(d.getTime())) {
          return NextResponse.json({ error: 'Invalid expiresAt date' }, { status: 400 })
        }
        updateData.expiresAt = d
      }
    }

    const link = await prisma.shortLink.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ link })
  } catch (error) {
    console.error('[PATCH /api/shortener/:id]', error)
    return NextResponse.json(
      { error: 'Failed to update link' },
      { status: 500 }
    )
  }
}

// DELETE /api/shortener/:id — delete link
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.shortLink.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    await prisma.shortLink.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/shortener/:id]', error)
    return NextResponse.json(
      { error: 'Failed to delete link' },
      { status: 500 }
    )
  }
}

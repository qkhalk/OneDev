import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateAlias, validateUrl, validateAlias } from '@/lib/shortener'

// GET /api/shortener — list all short links
export async function GET() {
  try {
    const links = await prisma.shortLink.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { visits: true } },
      },
    })

    const result = links.map((link) => ({
      ...link,
      visitCount: link._count.visits,
      _count: undefined,
    }))

    return NextResponse.json({ links: result })
  } catch (error) {
    console.error('[GET /api/shortener]', error)
    return NextResponse.json(
      { error: 'Failed to fetch short links' },
      { status: 500 }
    )
  }
}

// POST /api/shortener — create a new short link
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { originalUrl, customAlias, password, expiresAt } = body as {
      originalUrl?: string
      customAlias?: string
      password?: string
      expiresAt?: string
    }

    // Validate URL
    if (!originalUrl || !validateUrl(originalUrl)) {
      return NextResponse.json(
        { error: 'Invalid or missing URL. Must start with http:// or https://' },
        { status: 400 }
      )
    }

    // Determine alias
    let alias: string
    if (customAlias) {
      if (!validateAlias(customAlias)) {
        return NextResponse.json(
          { error: 'Custom alias must be 2-50 chars, only letters, numbers, hyphens, underscores' },
          { status: 400 }
        )
      }
      // Check uniqueness
      const existing = await prisma.shortLink.findUnique({ where: { alias: customAlias } })
      if (existing) {
        return NextResponse.json(
          { error: 'Alias already taken' },
          { status: 409 }
        )
      }
      alias = customAlias
    } else {
      // Generate unique random alias
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = generateAlias()
        const existing = await prisma.shortLink.findUnique({ where: { alias: candidate } })
        if (!existing) {
          alias = candidate
          break
        }
      }
      if (!alias!) {
        return NextResponse.json(
          { error: 'Failed to generate unique alias, please try again' },
          { status: 500 }
        )
      }
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

    // Create link
    const link = await prisma.shortLink.create({
      data: {
        alias,
        originalUrl,
        password: password || null,
        expiresAt: parsedExpiresAt,
      },
    })

    return NextResponse.json({ link }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/shortener]', error)
    return NextResponse.json(
      { error: 'Failed to create short link' },
      { status: 500 }
    )
  }
}

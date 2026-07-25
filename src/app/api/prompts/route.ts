import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  parseTags,
  serializeTags,
  isValidCategory,
  isValidModel,
  normalizePagination,
  VALID_CATEGORIES,
} from '@/lib/prompts/helpers'

// GET /api/prompts — list prompts with filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const tag = searchParams.get('tag')
    const model = searchParams.get('model')
    const sort = searchParams.get('sort') || 'new'
    const search = searchParams.get('search')
    const featured = searchParams.get('featured')

    const { skip, take, page, limit } = normalizePagination(
      searchParams.get('page'),
      searchParams.get('limit')
    )

    // Build where clause
    const where: Record<string, unknown> = {}

    if (category && isValidCategory(category)) {
      where.category = category
    }

    if (model && isValidModel(model)) {
      where.model = model
    }

    if (tag) {
      // Tags stored as JSON string — use LIKE to find the tag
      where.tags = { contains: `"${tag}"` }
    }

    if (featured === 'true') {
      where.featured = true
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { content: { contains: search } },
      ]
    }

    // Build orderBy
    let orderBy: Record<string, string>
    switch (sort) {
      case 'popular':
        orderBy = { likes: 'desc' }
        break
      case 'trending':
        // Trending: views in the last 7 days — approximate with views desc
        // combined with recent createdAt filter
        where.createdAt = {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        }
        orderBy = { views: 'desc' }
        break
      case 'new':
      default:
        orderBy = { createdAt: 'desc' }
        break
    }

    const [prompts, total] = await Promise.all([
      prisma.prompt.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          _count: { select: { comments: true } },
        },
      }),
      prisma.prompt.count({ where }),
    ])

    const result = prompts.map((p) => ({
      ...p,
      tags: parseTags(p.tags),
      commentCount: (p as any)._count?.comments || 0,
      _count: undefined,
    }))

    return NextResponse.json({
      prompts: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[GET /api/prompts]', error)
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    )
  }
}

// POST /api/prompts — create a new prompt
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      title,
      description,
      content,
      category = 'general',
      tags = [],
      model = 'all',
      isPremium = false,
      price = 0,
      authorName = 'anonymous',
      authorId,
    } = body as {
      title?: string
      description?: string
      content?: string
      category?: string
      tags?: string[]
      model?: string
      isPremium?: boolean
      price?: number
      authorName?: string
      authorId?: string
    }

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }
    if (
      !content ||
      typeof content !== 'string' ||
      content.trim().length === 0
    ) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Validate category
    const finalCategory = isValidCategory(category) ? category : 'general'
    const finalModel = isValidModel(model) ? model : 'all'

    // Validate tags
    const tagsArray = Array.isArray(tags)
      ? tags.filter((t) => typeof t === 'string')
      : []

    const prompt = await prisma.prompt.create({
      data: {
        title: title.trim(),
        description: (description || '').trim(),
        content: content.trim(),
        category: finalCategory,
        tags: serializeTags(tagsArray),
        model: finalModel,
        isPremium: Boolean(isPremium),
        price: Number(price) || 0,
        authorName: authorName || 'anonymous',
        authorId: authorId || null,
      },
    })

    return NextResponse.json(
      {
        prompt: {
          ...prompt,
          tags: parseTags(prompt.tags),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/prompts]', error)
    return NextResponse.json(
      { error: 'Failed to create prompt' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  parseTags,
  serializeTags,
  incrementViews,
  isValidCategory,
  isValidModel,
} from '@/lib/prompts/helpers'

// GET /api/prompts/[id] — prompt detail (increment views)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const prompt = await prisma.prompt.findUnique({
      where: { id },
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { comments: true } },
      },
    })

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
    }

    // Increment views (fire and forget)
    incrementViews(id)

    return NextResponse.json({
      prompt: {
        ...prompt,
        tags: parseTags(prompt.tags),
        commentCount: (prompt as any)._count?.comments || 0,
        _count: undefined,
      },
    })
  } catch (error) {
    console.error('[GET /api/prompts/[id]]', error)
    return NextResponse.json(
      { error: 'Failed to fetch prompt' },
      { status: 500 }
    )
  }
}

// PATCH /api/prompts/[id] — update prompt
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()

    const {
      title,
      description,
      content,
      category,
      tags,
      model,
      isPremium,
      price,
      authorName,
      featured,
    } = body as Record<string, unknown>

    // Check existence
    const existing = await prisma.prompt.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
    }

    // Build update data — only include provided fields
    const data: Record<string, unknown> = { updatedAt: new Date() }

    if (typeof title === 'string' && title.trim().length > 0) {
      data.title = title.trim()
    }
    if (typeof description === 'string') {
      data.description = description.trim()
    }
    if (typeof content === 'string' && content.trim().length > 0) {
      data.content = content.trim()
    }
    if (typeof category === 'string' && isValidCategory(category)) {
      data.category = category
    }
    if (typeof model === 'string' && isValidModel(model)) {
      data.model = model
    }
    if (Array.isArray(tags)) {
      data.tags = serializeTags(tags.filter((t) => typeof t === 'string'))
    }
    if (typeof isPremium === 'boolean') {
      data.isPremium = isPremium
    }
    if (typeof price === 'number') {
      data.price = price
    }
    if (typeof authorName === 'string') {
      data.authorName = authorName
    }
    if (typeof featured === 'boolean') {
      data.featured = featured
    }

    const updated = await prisma.prompt.update({
      where: { id },
      data,
    })

    return NextResponse.json({
      prompt: {
        ...updated,
        tags: parseTags(updated.tags),
      },
    })
  } catch (error) {
    console.error('[PATCH /api/prompts/[id]]', error)
    return NextResponse.json(
      { error: 'Failed to update prompt' },
      { status: 500 }
    )
  }
}

// DELETE /api/prompts/[id] — delete prompt
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.prompt.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
    }

    await prisma.prompt.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/prompts/[id]]', error)
    return NextResponse.json(
      { error: 'Failed to delete prompt' },
      { status: 500 }
    )
  }
}

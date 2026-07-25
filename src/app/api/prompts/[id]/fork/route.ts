import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parseTags } from '@/lib/prompts/helpers'

// POST /api/prompts/[id]/fork — fork prompt (copy to new prompt)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))

    const { authorName, authorId } = body as {
      authorName?: string
      authorId?: string
    }

    const original = await prisma.prompt.findUnique({ where: { id } })

    if (!original) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
    }

    // Increment fork count on original
    await prisma.prompt.update({
      where: { id },
      data: { forks: { increment: 1 } },
    })

    // Create forked copy
    const forked = await prisma.prompt.create({
      data: {
        title: `${original.title} (fork)`,
        description: original.description,
        content: original.content,
        category: original.category,
        tags: original.tags, // already serialized JSON string
        model: original.model,
        isPremium: false, // forks are free by default
        price: 0,
        authorName: authorName || 'anonymous',
        authorId: authorId || null,
      },
    })

    return NextResponse.json(
      {
        prompt: {
          ...forked,
          tags: parseTags(forked.tags),
        },
        forkedFrom: id,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/prompts/[id]/fork]', error)
    return NextResponse.json(
      { error: 'Failed to fork prompt' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/prompts/[id]/comments — list comments
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50)
    )

    const prompt = await prisma.prompt.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
    }

    const comments = await prisma.promptComment.findMany({
      where: { promptId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('[GET /api/prompts/[id]/comments]', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

// POST /api/prompts/[id]/comments — add comment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { authorName, content } = body as {
      authorName?: string
      content?: string
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      )
    }

    const prompt = await prisma.prompt.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
    }

    const comment = await prisma.promptComment.create({
      data: {
        promptId: id,
        authorName: authorName?.trim() || 'anonymous',
        content: content.trim(),
      },
    })

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/prompts/[id]/comments]', error)
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/prompts/[id]/like — like prompt (increment likes)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.prompt.findUnique({
      where: { id },
      select: { id: true, likes: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
    }

    const updated = await prisma.prompt.update({
      where: { id },
      data: { likes: { increment: 1 } },
      select: { id: true, likes: true },
    })

    return NextResponse.json({
      id: updated.id,
      likes: updated.likes,
      liked: true,
    })
  } catch (error) {
    console.error('[POST /api/prompts/[id]/like]', error)
    return NextResponse.json(
      { error: 'Failed to like prompt' },
      { status: 500 }
    )
  }
}

// DELETE /api/prompts/[id]/like — unlike prompt (decrement likes)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.prompt.findUnique({
      where: { id },
      select: { id: true, likes: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
    }

    // Prevent negative likes
    const updated = await prisma.prompt.update({
      where: { id },
      data: { likes: { decrement: 1 } },
      select: { id: true, likes: true },
    })

    // Ensure likes never go below 0
    if (updated.likes < 0) {
      await prisma.prompt.update({
        where: { id },
        data: { likes: 0 },
      })
    }

    return NextResponse.json({
      id: updated.id,
      likes: Math.max(0, updated.likes),
      liked: false,
    })
  } catch (error) {
    console.error('[DELETE /api/prompts/[id]/like]', error)
    return NextResponse.json(
      { error: 'Failed to unlike prompt' },
      { status: 500 }
    )
  }
}

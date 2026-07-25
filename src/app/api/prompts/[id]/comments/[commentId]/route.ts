import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// DELETE /api/prompts/[id]/comments/[commentId] — remove comment
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await params

    const comment = await prisma.promptComment.findUnique({
      where: { id: commentId },
      select: { id: true, promptId: true },
    })

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    // Ensure the comment belongs to the specified prompt
    if (comment.promptId !== id) {
      return NextResponse.json(
        { error: 'Comment does not belong to this prompt' },
        { status: 400 }
      )
    }

    await prisma.promptComment.delete({ where: { id: commentId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/prompts/[id]/comments/[commentId]]', error)
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    )
  }
}

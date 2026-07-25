import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTrendingPrompts, parseTags } from '@/lib/prompts/helpers'

// GET /api/prompts/trending — trending prompts (most viewed in last 7 days)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10)
    )
    const days = Math.min(
      90,
      Math.max(1, parseInt(searchParams.get('days') || '7', 10) || 7)
    )

    const prompts = await getTrendingPrompts(days, limit)

    const result = prompts.map((p) => ({
      ...p,
      tags: parseTags(p.tags),
    }))

    return NextResponse.json({
      prompts: result,
      days,
      limit,
    })
  } catch (error) {
    console.error('[GET /api/prompts/trending]', error)
    return NextResponse.json(
      { error: 'Failed to fetch trending prompts' },
      { status: 500 }
    )
  }
}

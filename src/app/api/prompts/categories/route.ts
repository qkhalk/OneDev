import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { VALID_CATEGORIES } from '@/lib/prompts/helpers'

// GET /api/prompts/categories — all categories with count
export async function GET() {
  try {
    // Get counts grouped by category
    const grouped = await prisma.prompt.groupBy({
      by: ['category'],
      _count: { category: true },
    })

    // Build a map for quick lookup
    const countMap = new Map<string, number>()
    for (const g of grouped) {
      countMap.set(g.category, (g as any)._count?.category || 0)
    }

    // Return all valid categories (even those with 0 prompts)
    const categories = VALID_CATEGORIES.map((name) => ({
      name,
      count: countMap.get(name) || 0,
    }))

    const total = categories.reduce((sum, c) => sum + c.count, 0)

    return NextResponse.json({
      categories,
      total,
    })
  } catch (error) {
    console.error('[GET /api/prompts/categories]', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

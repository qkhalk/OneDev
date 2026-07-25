import { NextResponse } from 'next/server'
import { services, getCategories } from '@/lib/api-hub/services'

/**
 * GET /api/hub/services
 * List all available API services.
 *
 * Query params:
 *   - category: filter by category (converter, shortener, monitor, utility)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    let result = services
    if (category) {
      result = services.filter((s) => s.category === category)
    }

    // Group by category for better UX
    const grouped: Record<string, typeof services> = {}
    for (const service of result) {
      if (!grouped[service.category]) {
        grouped[service.category] = []
      }
      grouped[service.category].push(service)
    }

    return NextResponse.json({
      services: result,
      categories: getCategories(),
      grouped,
      total: result.length,
    })
  } catch (error) {
    console.error('Failed to list services:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve services' },
      { status: 500 }
    )
  }
}

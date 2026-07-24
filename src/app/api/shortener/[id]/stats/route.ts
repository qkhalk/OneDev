import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/shortener/:id/stats — analytics for a link
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const link = await prisma.shortLink.findUnique({
      where: { id },
      include: { visits: true },
    })

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    // Clicks by day (last 14 days)
    const now = new Date()
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const clicksByDay: { date: string; count: number }[] = []
    const dayMap = new Map<string, number>()

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().split('T')[0]
      dayMap.set(key, 0)
    }

    for (const visit of link.visits) {
      const visitDate = new Date(visit.createdAt)
      if (visitDate >= fourteenDaysAgo) {
        const key = visitDate.toISOString().split('T')[0]
        if (dayMap.has(key)) {
          dayMap.set(key, (dayMap.get(key) || 0) + 1)
        }
      }
    }

    for (const [date, count] of dayMap) {
      clicksByDay.push({ date, count })
    }

    // Clicks by country
    const countryMap = new Map<string, number>()
    for (const visit of link.visits) {
      const c = visit.country || 'Unknown'
      countryMap.set(c, (countryMap.get(c) || 0) + 1)
    }
    const clicksByCountry = Array.from(countryMap.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)

    // Clicks by device
    const deviceMap = new Map<string, number>()
    for (const visit of link.visits) {
      const dv = visit.device || 'Unknown'
      deviceMap.set(dv, (deviceMap.get(dv) || 0) + 1)
    }
    const clicksByDevice = Array.from(deviceMap.entries())
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      totalClicks: link.clicks,
      totalVisits: link.visits.length,
      clicksByDay,
      clicksByCountry,
      clicksByDevice,
      recentVisits: link.visits
        .slice(0, 20)
        .map((v) => ({
          id: v.id,
          ip: v.ip,
          country: v.country,
          device: v.device,
          createdAt: v.createdAt,
        })),
    })
  } catch (error) {
    console.error('[GET /api/shortener/:id/stats]', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}

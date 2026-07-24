import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { provider, email, token } = await request.json()

    if (!email || !token) {
      return NextResponse.json(
        { error: 'email and token are required' },
        { status: 400 }
      )
    }

    // Proxy to upstream service
    const upstreamUrls: Record<string, string> = {
      hangout: 'https://mail.hangout.io.vn',
      '2b4d': 'https://2b4d.org',
    }

    const baseUrl = upstreamUrls[provider] || upstreamUrls.hangout

    try {
      // Try to fetch from upstream API
      const upstreamRes = await fetch(`${baseUrl}/api/inbox`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${token}`,
        },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(8000),
      })

      if (upstreamRes.ok) {
        const data = await upstreamRes.json()
        return NextResponse.json(data)
      }
    } catch {
      // Upstream might require auth/turnstile - return empty for now
    }

    // Return empty inbox as fallback
    return NextResponse.json({ messages: [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch inbox' },
      { status: 500 }
    )
  }
}

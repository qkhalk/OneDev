import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function POST(request: Request) {
  try {
    const { provider, domain } = await request.json()

    if (!provider || !['hangout', '2b4d'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "hangout" or "2b4d"' },
        { status: 400 }
      )
    }

    // Generate a random email address
    const prefix = Math.random().toString(36).substring(2, 10)
    const domains: Record<string, string[]> = {
      hangout: ['mail.hangout.io.vn'],
      '2b4d': ['2b4d.org'],
    }
    const availableDomains = domains[provider]
    const selectedDomain = domain && availableDomains.includes(domain) 
      ? domain 
      : availableDomains[0]

    const email = `${prefix}@${selectedDomain}`
    const token = randomUUID()

    // In production, this would call the upstream API to register the email
    // For now, we generate locally and proxy inbox requests
    return NextResponse.json({
      email,
      token,
      provider,
      createdAt: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create email' },
      { status: 500 }
    )
  }
}

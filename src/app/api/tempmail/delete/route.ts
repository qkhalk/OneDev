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

    // Proxy delete to upstream
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete email' },
      { status: 500 }
    )
  }
}

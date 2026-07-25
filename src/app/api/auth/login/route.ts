import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Vui lòng nhập email và mật khẩu' },
        { status: 400 }
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Email không hợp lệ' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu phải có ít nhất 6 ký tự' },
        { status: 400 }
      )
    }

    // Mock: simulate network delay
    await new Promise((r) => setTimeout(r, 600))

    // Mock response — in production, verify against DB
    const user = {
      id: 'usr_' + Math.random().toString(36).substring(2, 12),
      email,
      name: email.split('@')[0],
      avatar: null,
      createdAt: new Date().toISOString(),
    }

    const token = 'mock-jwt-' + Buffer.from(JSON.stringify({ id: user.id, email })).toString('base64url')

    const res = NextResponse.json({ token, user })
    res.cookies.set('onedev-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return res
  } catch {
    return NextResponse.json(
      { error: 'Lỗi server. Vui lòng thử lại.' },
      { status: 500 }
    )
  }
}

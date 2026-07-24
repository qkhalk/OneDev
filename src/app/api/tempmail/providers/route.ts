import { NextResponse } from 'next/server'
import { PROVIDERS } from '@/lib/tempmail/types'

export async function GET() {
  return NextResponse.json({ providers: PROVIDERS })
}

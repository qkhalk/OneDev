import { NextResponse } from 'next/server'
import { getSystemInfo } from '@/lib/vps/system'

export async function GET() {
  try {
    const info = await getSystemInfo()
    return NextResponse.json({
      success: true,
      data: info,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get system info' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { getMemoryUsage } from '@/lib/vps/system'

export async function GET() {
  try {
    const memory = await getMemoryUsage()
    return NextResponse.json({
      success: true,
      data: memory,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get memory usage' },
      { status: 500 }
    )
  }
}

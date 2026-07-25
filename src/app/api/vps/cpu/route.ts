import { NextResponse } from 'next/server'
import { getCpuUsage } from '@/lib/vps/system'

export async function GET() {
  try {
    const cpu = await getCpuUsage()
    return NextResponse.json({
      success: true,
      data: cpu,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get CPU usage' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { getDiskUsage } from '@/lib/vps/system'

export async function GET() {
  try {
    const disks = await getDiskUsage()
    return NextResponse.json({
      success: true,
      data: disks,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get disk usage' },
      { status: 500 }
    )
  }
}

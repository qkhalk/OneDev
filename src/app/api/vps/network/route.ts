import { NextResponse } from 'next/server'
import { getNetworkStats } from '@/lib/vps/system'

export async function GET() {
  try {
    const network = await getNetworkStats()
    return NextResponse.json({
      success: true,
      data: network,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get network stats' },
      { status: 500 }
    )
  }
}

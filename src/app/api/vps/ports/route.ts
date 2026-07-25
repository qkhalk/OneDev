import { NextResponse } from 'next/server'
import { getPortList } from '@/lib/vps/system'

export async function GET() {
  try {
    const ports = await getPortList()
    return NextResponse.json({
      success: true,
      data: ports,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get port list' },
      { status: 500 }
    )
  }
}

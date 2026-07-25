import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'all' // active | failed | all

    // Validate status parameter
    if (!['active', 'failed', 'all'].includes(statusFilter)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status parameter. Must be "active", "failed", or "all"' },
        { status: 400 }
      )
    }

    const stateFlag = statusFilter === 'all' ? '--all' : `--state=${statusFilter}`
    const { stdout } = await execAsync(
      `systemctl list-units --type=service ${stateFlag} --no-pager --no-legend`,
      {
        timeout: 10000,
        maxBuffer: 1024 * 1024 * 5,
      }
    )

    const lines = stdout.trim().split('\n')

    const services = lines
      .map((line) => {
        const parts = line.trim().split(/\s+/)
        if (parts.length < 4) return null
        const name = parts[0].replace('.service', '')
        const loadState = parts[1]
        const activeState = parts[3]

        let status = 'inactive'
        if (activeState === 'active') status = 'active'
        else if (activeState === 'failed') status = 'failed'
        else if (activeState === 'activating') status = 'activating'
        else if (activeState === 'inactive') status = 'inactive'

        return {
          name,
          status,
          enabled: loadState === 'loaded',
        }
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)

    return NextResponse.json({
      success: true,
      data: services,
      meta: {
        filter: statusFilter,
        count: services.length,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get service list' },
      { status: 500 }
    )
  }
}

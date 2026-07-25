import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sort = searchParams.get('sort') || 'cpu' // cpu | mem
    const limit = parseInt(searchParams.get('limit') || '20')

    // Validate sort parameter
    if (!['cpu', 'mem'].includes(sort)) {
      return NextResponse.json(
        { success: false, error: 'Invalid sort parameter. Must be "cpu" or "mem"' },
        { status: 400 }
      )
    }

    // Validate limit
    const safeLimit = Math.min(Math.max(limit, 1), 100)

    const sortFlag = sort === 'cpu' ? '-%cpu' : '-%mem'
    const { stdout } = await execAsync(`ps aux --sort=${sortFlag}`, {
      timeout: 10000,
      maxBuffer: 1024 * 1024 * 5,
    })

    const lines = stdout.trim().split('\n').slice(1) // skip header

    const processes = lines
      .slice(0, safeLimit)
      .map((line) => {
        const parts = line.trim().split(/\s+/)
        if (parts.length < 11) return null
        return {
          pid: parseInt(parts[1]) || 0,
          user: parts[0],
          cpu: parseFloat(parts[2]) || 0,
          mem: parseFloat(parts[3]) || 0,
          command: parts.slice(10).join(' '),
        }
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)

    return NextResponse.json({
      success: true,
      data: processes,
      meta: {
        sort,
        count: processes.length,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get process list' },
      { status: 500 }
    )
  }
}

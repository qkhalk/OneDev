import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { validateCommand } from '@/lib/vps/executor'

const execAsync = promisify(exec)

export async function GET() {
  try {
    const { stdout } = await execAsync(
      'docker ps -a --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}"',
      {
        timeout: 10000,
        maxBuffer: 1024 * 1024 * 5,
      }
    )

    const lines = stdout.trim().split('\n').filter((l) => l.trim())

    const containers = lines.map((line) => {
      const parts = line.split('|')
      return {
        id: parts[0] || '',
        name: parts[1] || '',
        image: parts[2] || '',
        status: parts[3] || '',
        ports: parts[4] ? parts[4].split(', ').filter((p) => p.trim()) : [],
      }
    })

    return NextResponse.json({
      success: true,
      data: containers,
    })
  } catch (error: any) {
    // Docker might not be installed or running
    const errorMessage = error.stderr || error.message || ''
    if (errorMessage.includes('Cannot connect to the Docker daemon') || errorMessage.includes('docker: not found')) {
      return NextResponse.json({
        success: true,
        data: [],
        warning: 'Docker is not running or not installed',
      })
    }
    return NextResponse.json(
      { success: false, error: errorMessage || 'Failed to get Docker containers' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, containerId } = body

    // Validate action
    const validActions = ['start', 'stop', 'restart']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate container ID (alphanumeric, must be reasonable length)
    if (!containerId || typeof containerId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(containerId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid container ID' },
        { status: 400 }
      )
    }

    // Build and validate command
    const command = `docker ${action} ${containerId}`
    const validation = validateCommand(command)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: `Command rejected: ${validation.reason}` },
        { status: 403 }
      )
    }

    const { stdout, stderr } = await execAsync(command, {
      timeout: 30000, // Docker operations may take longer
      maxBuffer: 1024 * 1024 * 5,
    })

    return NextResponse.json({
      success: true,
      data: {
        action,
        containerId,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.stderr || error.message || 'Failed to control container' },
      { status: 500 }
    )
  }
}

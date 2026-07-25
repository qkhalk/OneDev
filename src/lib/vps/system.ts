import { exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'

const execAsync = promisify(exec)

const SHELL_TIMEOUT = 10000 // 10 seconds

/**
 * Execute a shell command safely with timeout
 */
export async function runCommand(command: string, timeout: number = SHELL_TIMEOUT): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout,
      maxBuffer: 1024 * 1024 * 5, // 5MB
    })
    return { stdout, stderr }
  } catch (error: any) {
    if (error.killed) {
      throw new Error(`Command timed out after ${timeout}ms`)
    }
    // Return stderr from error if available
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
    }
  }
}

/**
 * Get system information
 */
export async function getSystemInfo(): Promise<{
  hostname: string
  platform: string
  arch: string
  uptime: number
  kernel: string
}> {
  let kernel = 'unknown'
  try {
    const { stdout } = await runCommand('uname -r')
    kernel = stdout.trim()
  } catch {
    // fallback
  }

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    uptime: os.uptime(),
    kernel,
  }
}

/**
 * Get CPU usage information
 */
export async function getCpuUsage(): Promise<{
  loadAvg: [number, number, number]
  cores: number
  usage: number
}> {
  const loadAvg = os.loadavg() as [number, number, number]
  const cores = os.cpus().length

  // Calculate CPU usage percentage from load average
  // usage = (loadAvg[0] / cores) * 100, capped at 100
  const usage = Math.min((loadAvg[0] / cores) * 100, 100)

  return {
    loadAvg,
    cores,
    usage: Math.round(usage * 100) / 100,
  }
}

/**
 * Get memory usage information
 */
export async function getMemoryUsage(): Promise<{
  total: number
  used: number
  free: number
  available: number
  swapTotal: number
  swapUsed: number
}> {
  const total = os.totalmem()
  const free = os.freemem()
  const used = total - free
  const available = free

  let swapTotal = 0
  let swapUsed = 0

  try {
    const { stdout } = await runCommand('free -b')
    const lines = stdout.trim().split('\n')
    const swapLine = lines.find((l) => l.startsWith('Swap:'))
    if (swapLine) {
      const parts = swapLine.split(/\s+/)
      swapTotal = parseInt(parts[1]) || 0
      swapUsed = parseInt(parts[2]) || 0
    }
  } catch {
    // fallback - try /proc/meminfo on Linux
    try {
      const { stdout } = await runCommand('cat /proc/meminfo')
      const matchSwapTotal = stdout.match(/SwapTotal:\s+(\d+)/)
      const matchSwapFree = stdout.match(/SwapFree:\s+(\d+)/)
      if (matchSwapTotal) {
        swapTotal = parseInt(matchSwapTotal[1]) * 1024
        const swapFree = matchSwapFree ? parseInt(matchSwapFree[1]) * 1024 : 0
        swapUsed = swapTotal - swapFree
      }
    } catch {
      // no swap info available
    }
  }

  return {
    total,
    used,
    free,
    available,
    swapTotal,
    swapUsed,
  }
}

/**
 * Get disk usage per mount point
 */
export async function getDiskUsage(): Promise<
  Array<{
    filesystem: string
    mount: string
    total: number
    used: number
    available: number
    percentage: number
  }>
> {
  try {
    const { stdout } = await runCommand('df -B1 --output=source,size,used,avail,pcent,target')
    const lines = stdout.trim().split('\n').slice(1) // skip header

    return lines
      .map((line) => {
        const parts = line.trim().split(/\s+/)
        if (parts.length < 6) return null
        return {
          filesystem: parts[0],
          mount: parts[5],
          total: parseInt(parts[1]) || 0,
          used: parseInt(parts[2]) || 0,
          available: parseInt(parts[3]) || 0,
          percentage: parseInt(parts[4].replace('%', '')) || 0,
        }
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
  } catch {
    return []
  }
}

/**
 * Get network interfaces and traffic stats
 */
export async function getNetworkStats(): Promise<{
  interfaces: Array<{ name: string; ip: string; rx: number; tx: number }>
}> {
  const interfaces: Array<{ name: string; ip: string; rx: number; tx: number }> = []

  // Get network interfaces from os module
  const netInterfaces = os.networkInterfaces()

  // Get traffic stats from /proc/net/dev (Linux)
  let trafficStats: Record<string, { rx: number; tx: number }> = {}
  try {
    const { stdout } = await runCommand('cat /proc/net/dev')
    const lines = stdout.trim().split('\n').slice(2) // skip header lines
    for (const line of lines) {
      const parts = line.trim().split(':')
      if (parts.length < 2) continue
      const name = parts[0].trim()
      const data = parts[1].trim().split(/\s+/)
      trafficStats[name] = {
        rx: parseInt(data[0]) || 0,
        tx: parseInt(data[8]) || 0,
      }
    }
  } catch {
    // not available
  }

  for (const [name, addrs] of Object.entries(netInterfaces)) {
    if (!addrs) continue
    const ipv4 = addrs.find((a) => a.family === 'IPv4')
    interfaces.push({
      name,
      ip: ipv4?.address || '',
      rx: trafficStats[name]?.rx || 0,
      tx: trafficStats[name]?.tx || 0,
    })
  }

  return { interfaces }
}

/**
 * Get process list sorted by CPU or memory
 */
export async function getProcessList(
  limit: number = 20
): Promise<
  Array<{
    pid: number
    user: string
    cpu: number
    mem: number
    command: string
  }>
> {
  try {
    const { stdout } = await runCommand('ps aux --sort=-%cpu')
    const lines = stdout.trim().split('\n').slice(1) // skip header

    return lines
      .slice(0, limit)
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
  } catch {
    return []
  }
}

/**
 * Get systemd service list
 */
export async function getServiceList(): Promise<
  Array<{
    name: string
    status: string
    enabled: boolean
  }>
> {
  try {
    const { stdout } = await runCommand(
      'systemctl list-units --type=service --all --no-pager --no-legend'
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

    return services
  } catch {
    return []
  }
}

/**
 * Get Docker containers
 */
export async function getDockerContainers(): Promise<
  Array<{
    id: string
    name: string
    image: string
    status: string
    ports: string[]
  }>
> {
  try {
    const { stdout } = await runCommand(
      'docker ps -a --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}"'
    )
    const lines = stdout.trim().split('\n').filter((l) => l.trim())

    return lines.map((line) => {
      const parts = line.split('|')
      return {
        id: parts[0] || '',
        name: parts[1] || '',
        image: parts[2] || '',
        status: parts[3] || '',
        ports: parts[4] ? parts[4].split(', ').filter((p) => p.trim()) : [],
      }
    })
  } catch {
    return []
  }
}

/**
 * Get list of open/listening ports
 */
export async function getPortList(): Promise<
  Array<{
    port: number
    protocol: string
    state: string
    service: string
  }>
> {
  try {
    const { stdout } = await runCommand('ss -tlnp')
    const lines = stdout.trim().split('\n').slice(1) // skip header

    return lines
      .map((line) => {
        const parts = line.trim().split(/\s+/)
        if (parts.length < 5) return null
        const protocol = parts[0] // tcp, udp
        const state = parts[1] // LISTEN, etc.
        const localAddr = parts[4] // 0.0.0.0:80 or [::]:80

        // Extract port from address
        const portMatch = localAddr.match(/:(\d+)$/)
        if (!portMatch) return null
        const port = parseInt(portMatch[1])

        // Extract service/process name if available
        const processInfo = parts.slice(5).join(' ')
        const serviceMatch = processInfo.match(/users:\(\("([^"]+)"/)
        const service = serviceMatch ? serviceMatch[1] : ''

        return {
          port,
          protocol: protocol.toUpperCase(),
          state,
          service,
        }
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
  } catch {
    return []
  }
}

/**
 * Get cron jobs
 */
export async function getCronJobs(): Promise<
  Array<{
    schedule: string
    user: string
    command: string
  }>
> {
  const jobs: Array<{ schedule: string; user: string; command: string }> = []

  // Get current user's crontab
  try {
    const { stdout } = await runCommand('crontab -l 2>/dev/null')
    const lines = stdout.trim().split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const parts = trimmed.split(/\s+/)
      if (parts.length >= 6) {
        const schedule = parts.slice(0, 5).join(' ')
        const command = parts.slice(5).join(' ')
        jobs.push({
          schedule,
          user: process.env.USER || 'root',
          command,
        })
      }
    }
  } catch {
    // no crontab
  }

  // Get system cron jobs from /etc/crontab
  try {
    const { stdout } = await runCommand('cat /etc/crontab 2>/dev/null')
    const lines = stdout.trim().split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const parts = trimmed.split(/\s+/)
      if (parts.length >= 7) {
        const schedule = parts.slice(0, 5).join(' ')
        const user = parts[5]
        const command = parts.slice(6).join(' ')
        jobs.push({ schedule, user, command })
      }
    }
  } catch {
    // no system crontab
  }

  // Get cron.d entries
  try {
    const { stdout } = await runCommand('ls /etc/cron.d/ 2>/dev/null')
    const files = stdout.trim().split('\n').filter((f) => f.trim() && !f.startsWith('.'))
    for (const file of files) {
      try {
        const { stdout: content } = await runCommand(`cat /etc/cron.d/${file} 2>/dev/null`)
        const lines = content.trim().split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) continue
          const parts = trimmed.split(/\s+/)
          if (parts.length >= 7) {
            const schedule = parts.slice(0, 5).join(' ')
            const user = parts[5]
            const command = parts.slice(6).join(' ')
            jobs.push({ schedule, user, command })
          }
        }
      } catch {
        // skip
      }
    }
  } catch {
    // no cron.d
  }

  return jobs
}

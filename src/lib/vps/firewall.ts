import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const SHELL_TIMEOUT = 10000

/**
 * Execute a shell command safely with timeout
 */
async function runCommand(command: string, timeout: number = SHELL_TIMEOUT): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout,
      maxBuffer: 1024 * 1024 * 5,
    })
    return { stdout, stderr }
  } catch (error: any) {
    if (error.killed) {
      throw new Error(`Command timed out after ${timeout}ms`)
    }
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
    }
  }
}

/**
 * Get UFW (Uncomplicated Firewall) status and rules
 */
export async function getUfwStatus(): Promise<
  Array<{ rule: string; action: string }>
> {
  const rules: Array<{ rule: string; action: string }> = []

  try {
    const { stdout } = await runCommand('ufw status verbose 2>/dev/null')
    const lines = stdout.trim().split('\n')

    for (const line of lines) {
      const trimmed = line.trim()

      // Skip status lines
      if (
        trimmed.startsWith('Status:') ||
        trimmed.startsWith('Logging:') ||
        trimmed.startsWith('Default') ||
        trimmed.includes('profiles')
      ) {
        continue
      }

      // Parse rule lines like:
      // "22/tcp                     ALLOW IN    Anywhere"
      // "80/tcp (v6)                ALLOW IN    Anywhere (v6)"
      // "Anywhere on eth0           ALLOW FWD   Anywhere on eth0"
      const match = trimmed.match(/^(.+?)\s+(ALLOW|DENY|LIMIT|REJECT)(?:\s+(IN|OUT|FWD))?\s+(.+)$/i)
      if (match) {
        const port = match[1].trim()
        const action = match[2].toUpperCase()
        const direction = match[3] || ''
        const source = match[4].trim()
        rules.push({
          rule: `${port} ${direction} ${source}`.trim(),
          action,
        })
      }
    }
  } catch {
    // UFW not available or not installed
  }

  return rules
}

/**
 * Get iptables rules as raw text
 */
export async function getIptablesList(): Promise<string> {
  try {
    const { stdout } = await runCommand('iptables -L -n -v 2>/dev/null')
    return stdout.trim()
  } catch {
    return ''
  }
}

/**
 * Get firewall status combining UFW and iptables
 */
export async function getFirewallStatus(): Promise<{
  ufwEnabled: boolean
  ufwRules: Array<{ rule: string; action: string }>
  iptables: string
}> {
  let ufwEnabled = false

  try {
    const { stdout } = await runCommand('ufw status 2>/dev/null')
    ufwEnabled = stdout.toLowerCase().includes('status: active')
  } catch {
    // UFW not available
  }

  const [ufwRules, iptables] = await Promise.all([
    getUfwStatus(),
    getIptablesList(),
  ])

  return {
    ufwEnabled,
    ufwRules,
    iptables,
  }
}

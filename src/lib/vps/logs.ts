import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

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
 * Whitelist of allowed log files
 */
const ALLOWED_LOG_FILES = [
  '/var/log/syslog',
  '/var/log/messages',
  '/var/log/auth.log',
  '/var/log/kern.log',
  '/var/log/boot.log',
  '/var/log/dmesg',
  '/var/log/daemon.log',
  '/var/log/mail.log',
  '/var/log/nginx/access.log',
  '/var/log/nginx/error.log',
  '/var/log/mysql/error.log',
  '/var/log/postgresql/postgresql.log',
  '/var/log/redis/redis-server.log',
  '/var/log/mongodb/mongod.log',
  '/var/log/docker.log',
  '/var/log/fail2ban.log',
  '/var/log/uwsgi.log',
  '/var/log/supervisor/supervisord.log',
]

/**
 * Validate log file path against whitelist
 */
function isAllowedLogFile(filePath: string): boolean {
  const normalized = path.normalize(filePath)
  return ALLOWED_LOG_FILES.some((allowed) => {
    const normAllowed = path.normalize(allowed)
    return normalized === normAllowed || normalized.startsWith(normAllowed)
  })
}

/**
 * Read last N lines from a log file
 */
export async function readLog(file: string, lines: number = 100): Promise<string[]> {
  // Validate file path
  if (!isAllowedLogFile(file)) {
    throw new Error(`Access denied: log file '${file}' is not in the allowed list`)
  }

  // Limit lines to prevent excessive output
  const safeLines = Math.min(Math.max(lines, 1), 1000)

  try {
    const { stdout } = await runCommand(`tail -n ${safeLines} ${file} 2>/dev/null`)
    return stdout.trim().split('\n').filter((l) => l.trim())
  } catch {
    return []
  }
}

/**
 * Get systemd journal logs for a service
 */
export async function getJournalLogs(
  service: string,
  lines: number = 50
): Promise<string[]> {
  // Validate service name (alphanumeric, dash, underscore, dot only)
  if (!/^[a-zA-Z0-9._-]+$/.test(service)) {
    throw new Error(`Invalid service name: ${service}`)
  }

  // Limit lines
  const safeLines = Math.min(Math.max(lines, 1), 500)

  try {
    const { stdout } = await runCommand(
      `journalctl -u ${service} --no-pager -n ${safeLines} 2>/dev/null`
    )
    return stdout.trim().split('\n').filter((l) => l.trim())
  } catch {
    return []
  }
}

/**
 * Get available log files from /var/log
 */
export async function getAvailableLogs(): Promise<string[]> {
  try {
    const { stdout } = await runCommand('find /var/log -name "*.log" -type f 2>/dev/null')
    return stdout.trim().split('\n').filter((l) => l.trim())
  } catch {
    return []
  }
}

/**
 * Get list of systemd services that have logs
 */
export async function getLoggableServices(): Promise<string[]> {
  try {
    const { stdout } = await runCommand(
      'systemctl list-units --type=service --state=active --no-pager --no-legend 2>/dev/null'
    )
    return stdout
      .trim()
      .split('\n')
      .map((line) => line.trim().split(/\s+/)[0]?.replace('.service', ''))
      .filter((s): s is string => !!s && s.length > 0)
  } catch {
    return []
  }
}

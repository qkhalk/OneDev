import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const SHELL_TIMEOUT = 10000

/**
 * Whitelist of allowed command prefixes
 * Only these base commands can be executed
 */
const COMMAND_WHITELIST = [
  'df',
  'free',
  'ps',
  'systemctl',
  'docker',
  'ss',
  'uptime',
  'top',
  'htop',
  'uname',
  'hostname',
  'who',
  'w',
  'last',
  'cat /proc/',
  'cat /etc/os-release',
  'lsblk',
  'lscpu',
  'lsmem',
  'lspci',
  'lsusb',
  'ifconfig',
  'ip addr',
  'ip link',
  'netstat',
  'crontab -l',
  'ufw status',
  'iptables -L',
  'journalctl',
  'tail /var/log',
  'head /var/log',
]

/**
 * Blacklist of dangerous commands/patterns that must NEVER execute
 * Even if somehow passes whitelist, these patterns are blocked
 */
const COMMAND_BLACKLIST_PATTERNS = [
  /\brm\s+-rf\b/i,
  /\brm\s+/i,
  /\bdd\s+/i,
  /\bmkfs\b/i,
  /\bfdisk\b/i,
  /\bkill\s+-9\b/i,
  /\bkillall\b/i,
  /\bpkill\b/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bhalt\b/i,
  /\bpoweroff\b/i,
  /\binit\s+0\b/i,
  /\binit\s+6\b/i,
  /\biptables\s+-F\b/i, // flush iptables
  /\bufw\s+disable\b/i,
  /\bchmod\s+777\b/i,
  /\bchown\b/i,
  /\bmount\b/i,
  /\bumount\b/i,
  /\bformat\b/i,
  /\bwipefs\b/i,
  /\bparted\b/i,
  /\bcfdisk\b/i,
  /\bnc\s+/i, // netcat
  /\bwget\s+/i,
  /\bcurl\s+/i,
  /\bpython\s+/i,
  /\bperl\s+/i,
  /\bruby\s+/i,
  /\bnode\s+/i,
  /\bbash\s+/i,
  /\bsh\s+/i,
  /\bzsh\s+/i,
  /\beval\b/i,
  /\bexec\b/i,
  /\bsource\b/i,
  /\bexport\b/i,
  /\b>\s*\/dev\//i, // writing to devices
  /\b>\s*\/etc\//i, // writing to system files
  /\bmkswap\b/i,
  /\bswapoff\b/i,
  /\bswapon\b/i,
  /\btee\b/i,
  /\bsudo\s+/i,
  /\bsu\s+/i,
  /`.*`/, // backtick command substitution
  /\$\(.*\)/, // $(.) command substitution
  /;\s*/, // command chaining with semicolon
  /\|\s*/, // piping
  /&&\s*/, // AND operator
  /\|\|\s*/, // OR operator
  /\bmv\s+/i,
  /\bcp\s+/i,
  /\bscp\s+/i,
  /\brsync\s+/i,
  /\btar\s+/i,
  /\bzip\s+/i,
  /\bunzip\s+/i,
  /\bgzip\s+/i,
  /\bgunzip\s+/i,
]

export interface ExecuteResult {
  stdout: string
  stderr: string
  code: number
}

/**
 * Check if a command is in the whitelist
 */
function isWhitelisted(command: string): boolean {
  const trimmed = command.trim()

  // Check against whitelist
  return COMMAND_WHITELIST.some((allowed) => {
    if (trimmed.startsWith(allowed)) {
      // Make sure there's a word boundary after the command
      const nextChar = trimmed[allowed.length]
      return nextChar === undefined || nextChar === ' ' || nextChar === '\t'
    }
    return false
  })
}

/**
 * Check if a command contains blacklisted patterns
 */
function containsBlacklisted(command: string): boolean {
  return COMMAND_BLACKLIST_PATTERNS.some((pattern) => pattern.test(command))
}

/**
 * Validate a command against whitelist and blacklist
 */
export function validateCommand(command: string): { valid: boolean; reason?: string } {
  const trimmed = command.trim()

  if (!trimmed) {
    return { valid: false, reason: 'Empty command' }
  }

  // Check blacklist first
  if (containsBlacklisted(trimmed)) {
    return { valid: false, reason: 'Command contains blacklisted pattern' }
  }

  // Check whitelist
  if (!isWhitelisted(trimmed)) {
    return { valid: false, reason: 'Command is not in the whitelist' }
  }

  return { valid: true }
}

/**
 * Execute a shell command with whitelist validation
 */
export async function executeCommand(command: string): Promise<ExecuteResult> {
  // Validate command
  const validation = validateCommand(command)
  if (!validation.valid) {
    return {
      stdout: '',
      stderr: `Command rejected: ${validation.reason}`,
      code: 126, // permission denied
    }
  }

  try {
    const { stdout, stderr } = await execAsync(command.trim(), {
      timeout: SHELL_TIMEOUT,
      maxBuffer: 1024 * 1024 * 5,
    })
    return { stdout, stderr, code: 0 }
  } catch (error: any) {
    if (error.killed) {
      return {
        stdout: '',
        stderr: `Command timed out after ${SHELL_TIMEOUT}ms`,
        code: 124,
      }
    }
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      code: error.code || 1,
    }
  }
}

/**
 * Get the list of whitelisted commands
 */
export function getWhitelistedCommands(): string[] {
  return [...COMMAND_WHITELIST]
}

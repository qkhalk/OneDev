import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const SSH_TIMEOUT = 15000 // 15 seconds for SSH commands

export interface SSHHost {
  id: string
  name: string
  host: string
  port: number
  username: string
  password?: string
  privateKey?: string
}

export interface SSHResult {
  stdout: string
  stderr: string
  code: number
}

/**
 * SSH Executor - executes commands on remote hosts via SSH
 * Uses child_process.exec with ssh command
 */
export class SSHExecutor {
  private host: SSHHost

  constructor(host: SSHHost) {
    this.host = host
  }

  /**
   * Build SSH command with options
   */
  private buildSSHCommand(remoteCommand: string): string {
    const parts = [
      'ssh',
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ConnectTimeout=10',
      '-o', 'BatchMode=yes',
      '-o', 'LogLevel=ERROR',
      '-p', String(this.host.port || 22),
    ]

    // Use private key if provided
    if (this.host.privateKey) {
      // Write key to temp file for the command
      // In production, use ssh-agent or key files
      parts.push('-i', this.host.privateKey)
    }

    // User@host
    parts.push(`${this.host.username}@${this.host.host}`)

    // Remote command (escaped)
    parts.push(`'${remoteCommand.replace(/'/g, "'\\''")}'`)

    return parts.join(' ')
  }

  /**
   * Execute a command on the remote host
   */
  async exec(command: string): Promise<SSHResult> {
    const sshCommand = this.buildSSHCommand(command)

    try {
      const { stdout, stderr } = await execAsync(sshCommand, {
        timeout: SSH_TIMEOUT,
        maxBuffer: 1024 * 1024 * 5,
      })
      return { stdout, stderr, code: 0 }
    } catch (error: any) {
      if (error.killed) {
        return {
          stdout: '',
          stderr: `Command timed out after ${SSH_TIMEOUT}ms`,
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
   * Test SSH connection to the remote host
   */
  async testConnection(): Promise<boolean> {
    const result = await this.exec('echo "connection_ok"')
    return result.code === 0 && result.stdout.includes('connection_ok')
  }

  /**
   * Execute multiple commands in sequence
   */
  async execMultiple(commands: string[]): Promise<SSHResult[]> {
    const results: SSHResult[] = []
    for (const cmd of commands) {
      const result = await this.exec(cmd)
      results.push(result)
      if (result.code !== 0) break
    }
    return results
  }
}

/**
 * Create an SSH executor instance
 */
export function createSSHExecutor(host: SSHHost): SSHExecutor {
  return new SSHExecutor(host)
}

/**
 * Quick test SSH connection to a host
 */
export async function testSSHConnection(host: SSHHost): Promise<boolean> {
  const executor = new SSHExecutor(host)
  return executor.testConnection()
}

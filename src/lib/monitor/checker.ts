import { promises as dns } from 'dns'
import * as net from 'net'
import * as tls from 'tls'
import { URL } from 'url'

export interface CheckResult {
  status: 'up' | 'down' | 'degraded'
  responseTime?: number
  statusCode?: number
  message?: string
  sslDays?: number
}

export interface SslInfo {
  valid: boolean
  daysLeft: number
  issuer?: string
}

/**
 * Check HTTP/HTTPS endpoint
 * - 2xx, 3xx = up
 * - 4xx, 5xx = down
 */
export async function checkHttp(url: string, timeout: number): Promise<CheckResult> {
  const start = Date.now()

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000)

    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'OneDev-Monitor/1.0',
      },
    })

    clearTimeout(timeoutId)
    const responseTime = Date.now() - start

    const statusCode = response.status
    if (statusCode >= 200 && statusCode < 400) {
      // For HTTPS, try to get SSL info
      let sslDays: number | undefined
      try {
        const parsed = new URL(url)
        if (parsed.protocol === 'https:') {
          const sslInfo = await checkSsl(parsed.hostname)
          sslDays = sslInfo.daysLeft
        }
      } catch {
        // SSL check is optional
      }

      return {
        status: 'up',
        responseTime,
        statusCode,
        message: 'OK',
        sslDays,
      }
    } else {
      return {
        status: 'down',
        responseTime,
        statusCode,
        message: `HTTP ${statusCode}`,
      }
    }
  } catch (error: any) {
    const responseTime = Date.now() - start

    if (error.name === 'AbortError') {
      return {
        status: 'down',
        responseTime,
        message: `Timeout after ${timeout}s`,
      }
    }

    return {
      status: 'down',
      responseTime,
      message: error.message || 'Connection failed',
    }
  }
}

/**
 * Check TCP port connectivity
 */
export async function checkTcp(host: string, port: number, timeout: number): Promise<CheckResult> {
  const start = Date.now()

  return new Promise<CheckResult>((resolve) => {
    const socket = new net.Socket()
    let settled = false

    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true
        socket.destroy()
        const responseTime = Date.now() - start
        resolve({
          status: 'down',
          responseTime,
          message: `TCP timeout after ${timeout}s`,
        })
      }
    }, timeout * 1000)

    socket.connect(port, host, () => {
      if (!settled) {
        settled = true
        clearTimeout(timeoutId)
        const responseTime = Date.now() - start
        socket.destroy()
        resolve({
          status: 'up',
          responseTime,
          message: `TCP ${host}:${port} connected`,
        })
      }
    })

    socket.on('error', (err) => {
      if (!settled) {
        settled = true
        clearTimeout(timeoutId)
        const responseTime = Date.now() - start
        socket.destroy()
        resolve({
          status: 'down',
          responseTime,
          message: err.message,
        })
      }
    })
  })
}

/**
 * Check DNS resolution
 */
export async function checkDns(domain: string, timeout: number): Promise<CheckResult> {
  const start = Date.now()

  // Set a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`DNS timeout after ${timeout}s`)), timeout * 1000)
  )

  try {
    const addresses = await Promise.race([
      dns.resolve4(domain),
      timeoutPromise,
    ])

    const responseTime = Date.now() - start

    if (addresses.length > 0) {
      return {
        status: 'up',
        responseTime,
        message: `Resolved: ${addresses.join(', ')}`,
      }
    } else {
      return {
        status: 'down',
        responseTime,
        message: 'No DNS records found',
      }
    }
  } catch (error: any) {
    const responseTime = Date.now() - start
    return {
      status: 'down',
      responseTime,
      message: error.message || 'DNS resolution failed',
    }
  }
}

/**
 * Check SSL certificate info
 */
export async function checkSsl(domain: string): Promise<SslInfo> {
  return new Promise<SslInfo>((resolve) => {
    let settled = false

    const socket = tls.connect(
      {
        host: domain,
        port: 443,
        servername: domain,
        rejectUnauthorized: false,
      },
      () => {
        if (settled) return
        settled = true

        const cert = socket.getPeerCertificate()

        if (!cert || Object.keys(cert).length === 0) {
          socket.destroy()
          resolve({
            valid: false,
            daysLeft: 0,
          })
          return
        }

        const validTo = new Date(cert.valid_to as string)
        const now = new Date()
        const daysLeft = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        socket.destroy()

        resolve({
          valid: daysLeft > 0,
          daysLeft,
          issuer: (cert.issuer?.O || cert.issuer?.CN) as string,
        })
      }
    )

    socket.setTimeout(10000, () => {
      if (!settled) {
        settled = true
        socket.destroy()
        resolve({
          valid: false,
          daysLeft: 0,
        })
      }
    })

    socket.on('error', () => {
      if (!settled) {
        settled = true
        socket.destroy()
        resolve({
          valid: false,
          daysLeft: 0,
        })
      }
    })
  })
}

/**
 * Parse URL for TCP check (host:port format)
 */
export function parseTcpUrl(url: string): { host: string; port: number } {
  try {
    // Format: tcp://host:port or host:port
    const cleaned = url.replace(/^tcp:\/\//, '')
    const [host, port] = cleaned.split(':')
    return { host, port: parseInt(port) || 80 }
  } catch {
    return { host: url, port: 80 }
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
    return parsed.hostname
  } catch {
    return url
  }
}

/**
 * Run check based on monitor type
 */
export async function runCheck(
  type: string,
  url: string,
  timeout: number
): Promise<CheckResult> {
  switch (type) {
    case 'http':
    case 'https':
      return checkHttp(url, timeout)

    case 'tcp': {
      const { host, port } = parseTcpUrl(url)
      return checkTcp(host, port, timeout)
    }

    case 'dns': {
      const domain = extractDomain(url)
      return checkDns(domain, timeout)
    }

    default:
      return {
        status: 'down',
        message: `Unknown monitor type: ${type}`,
      }
  }
}

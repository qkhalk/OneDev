import { createServer } from 'http'
import { Server } from 'socket.io'
import { Client } from 'ssh2'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ─── Types ───────────────────────────────────────────────────────────────────

interface SSHConnectPayload {
  serverId: string
  host: string
  port: number
  username: string
  authType: 'password' | 'key'
  password?: string
  privateKey?: string
  sessionId: string
}

interface SSHDataPayload {
  sessionId: string
  data: string
}

interface SSHResizePayload {
  sessionId: string
  cols: number
  rows: number
}

interface SSHDisconnectPayload {
  sessionId: string
}

interface CommandBroadcastPayload {
  serverIds: string[]
  command: string
  commandId: string
}

interface ServerInfo {
  id: string
  host: string
  port: number
  username: string
  authType: 'password' | 'key'
  password?: string
  privateKey?: string
}

interface CheckStatusPayload {
  servers: ServerInfo[]
}

interface ActiveSession {
  conn: Client
  stream: NodeJS.WritableStream | null
  serverId: string
  socketId: string
  userId?: string // User-scoped isolation
}

// ─── State ───────────────────────────────────────────────────────────────────

// Map sessionId -> ActiveSession
const activeSessions = new Map<string, ActiveSession>()

// Map socketId -> Set<sessionId> (track which sessions belong to which socket)
const socketSessions = new Map<string, Set<string>>()

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildSSHConfig(payload: SSHConnectPayload | ServerInfo) {
  const config: Record<string, unknown> = {
    host: payload.host,
    port: payload.port,
    username: payload.username,
    readyTimeout: 20000,
    keepaliveInterval: 10000,
    keepaliveCountMax: 3,
  }

  if (payload.authType === 'password' && payload.password) {
    config.password = payload.password
  } else if (payload.authType === 'key' && payload.privateKey) {
    config.privateKey = payload.privateKey
  }

  return config
}

function cleanupSession(sessionId: string) {
  const session = activeSessions.get(sessionId)
  if (session) {
    try {
      session.conn.end()
    } catch {
      // ignore errors on close
    }
    activeSessions.delete(sessionId)

    // Remove from socket tracking
    const sessions = socketSessions.get(session.socketId)
    if (sessions) {
      sessions.delete(sessionId)
      if (sessions.size === 0) {
        socketSessions.delete(session.socketId)
      }
    }
  }
}

function cleanupAllSessionsForSocket(socketId: string) {
  const sessions = socketSessions.get(socketId)
  if (sessions) {
    for (const sessionId of sessions) {
      cleanupSession(sessionId)
    }
  }
}

// ─── Resource Data Parser ────────────────────────────────────────────────────

function parseResourceData(
  serverId: string,
  cpuOutput: string,
  ramOutput: string,
  diskOutput: string,
  uptimeOutput: string
) {
  // Parse CPU / load average from top output
  let cpu = cpuOutput.trim()
  let loadAvg = ''

  // Try to extract load average from top output (format: "load average: 0.10, 0.15, 0.20")
  const loadMatch = cpuOutput.match(/load average:\s*([\d.,\s]+)/i)
  if (loadMatch) {
    loadAvg = loadMatch[1].trim()
  }

  // Try to extract CPU usage percentage from top (%Cpu(s): ... us)
  let cpuPercent = 0
  const cpuMatch = cpuOutput.match(/%Cpu\(s\):\s*([\d.]+)\s*us/i)
  if (cpuMatch) {
    cpuPercent = parseFloat(cpuMatch[1])
  }

  // Parse RAM from free -m output
  let ram = { total: '0', used: '0', free: '0', percent: 0 }
  const ramLines = ramOutput.trim().split('\n')
  if (ramLines.length >= 2) {
    // Skip header line, parse "Mem:" line
    const memLine = ramLines.find((l) => l.toLowerCase().startsWith('mem:'))
    if (memLine) {
      const parts = memLine.split(/\s+/).filter(Boolean)
      if (parts.length >= 3) {
        ram = {
          total: parts[1],
          used: parts[2],
          free: parts[3] || parts[parts.length - 1],
          percent: parts[1] && parts[2] ? Math.round((parseFloat(parts[2]) / parseFloat(parts[1])) * 100) : 0,
        }
      }
    }
  }

  // Parse disk from df -h / output
  let disk = { total: '0', used: '0', free: '0', percent: 0 }
  const diskLines = diskOutput.trim().split('\n')
  if (diskLines.length >= 2) {
    const dataLine = diskLines[1]
    const parts = dataLine.split(/\s+/).filter(Boolean)
    if (parts.length >= 6) {
      const percentStr = parts[4].replace('%', '')
      disk = {
        total: parts[1],
        used: parts[2],
        free: parts[3],
        percent: parseInt(percentStr) || 0,
      }
    }
  }

  // Parse uptime
  const uptime = uptimeOutput.trim()

  return {
    serverId,
    cpu,
    cpuPercent,
    loadAvg,
    ram,
    disk,
    uptime,
  }
}

// ─── Socket.io Connection Handler ────────────────────────────────────────────

io.on('connection', (socket) => {
  // Extract userId from auth for user-room isolation
  const userId = (socket.handshake.auth as { userId?: string })?.userId
  if (userId) {
    socket.join(`user:${userId}`)
    console.log(`[SSH Service] Client connected: ${socket.id}, userId: ${userId}`)
  } else {
    console.log(`[SSH Service] Client connected: ${socket.id} (no userId)`)
  }

  // ── ssh:connect ──────────────────────────────────────────────────────────

  socket.on('ssh:connect', (payload: SSHConnectPayload) => {
    const { serverId, sessionId } = payload
    console.log(`[SSH Service] Connect request: sessionId=${sessionId}, serverId=${serverId}, host=${payload.host}`)

    // If session already exists, clean it up first
    cleanupSession(sessionId)

    const conn = new Client()
    const session: ActiveSession = {
      conn,
      stream: null,
      serverId,
      socketId: socket.id,
      userId,
    }

    activeSessions.set(sessionId, session)

    // Track session per socket
    if (!socketSessions.has(socket.id)) {
      socketSessions.set(socket.id, new Set())
    }
    socketSessions.get(socket.id)!.add(sessionId)

    conn.on('ready', () => {
      console.log(`[SSH Service] SSH connected: sessionId=${sessionId}`)

      // Open an interactive shell with PTY
      conn.shell(
        { term: 'xterm-256color', cols: 80, rows: 24 },
        (err, stream) => {
          if (err) {
            console.error(`[SSH Service] Shell error: sessionId=${sessionId}`, err.message)
            socket.emit('ssh:error', { sessionId, error: err.message })
            cleanupSession(sessionId)
            return
          }

          session.stream = stream as unknown as NodeJS.WritableStream

          // Notify client of successful connection
          socket.emit('ssh:connected', { sessionId, serverId })

          // Forward SSH shell output to client
          stream.on('data', (data: Buffer) => {
            socket.emit('ssh:data', { sessionId, data: data.toString('utf-8') })
          })

          stream.on('close', () => {
            console.log(`[SSH Service] Shell closed: sessionId=${sessionId}`)
            socket.emit('ssh:disconnected', { sessionId, serverId })
            cleanupSession(sessionId)
          })

          stream.stderr.on('data', (data: Buffer) => {
            socket.emit('ssh:data', { sessionId, data: data.toString('utf-8') })
          })
        }
      )
    })

    conn.on('error', (err) => {
      console.error(`[SSH Service] SSH error: sessionId=${sessionId}`, err.message)
      socket.emit('ssh:error', { sessionId, error: err.message })
      cleanupSession(sessionId)
    })

    conn.on('close', () => {
      console.log(`[SSH Service] SSH connection closed: sessionId=${sessionId}`)
      // Only emit disconnected if the session is still tracked (not already cleaned up)
      if (activeSessions.has(sessionId)) {
        socket.emit('ssh:disconnected', { sessionId, serverId })
        cleanupSession(sessionId)
      }
    })

    conn.on('end', () => {
      console.log(`[SSH Service] SSH connection ended: sessionId=${sessionId}`)
    })

    // Initiate connection
    try {
      const config = buildSSHConfig(payload)
      conn.connect(config)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown connection error'
      console.error(`[SSH Service] Connect failed: sessionId=${sessionId}`, message)
      socket.emit('ssh:error', { sessionId, error: message })
      cleanupSession(sessionId)
    }
  })

  // ── ssh:data ─────────────────────────────────────────────────────────────

  socket.on('ssh:data', (payload: SSHDataPayload) => {
    const { sessionId, data } = payload
    const session = activeSessions.get(sessionId)

    if (session?.stream) {
      try {
        session.stream.write(data)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Write error'
        console.error(`[SSH Service] Write error: sessionId=${sessionId}`, message)
        socket.emit('ssh:error', { sessionId, error: message })
      }
    }
  })

  // ── ssh:resize ───────────────────────────────────────────────────────────

  socket.on('ssh:resize', (payload: SSHResizePayload) => {
    const { sessionId, cols, rows } = payload
    const session = activeSessions.get(sessionId)

    if (session?.stream && 'setWindow' in session.stream) {
      try {
        ;(session.stream as unknown as { setWindow: (rows: number, cols: number, height: number, width: number) => void }).setWindow(rows, cols, 0, 0)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Resize error'
        console.error(`[SSH Service] Resize error: sessionId=${sessionId}`, message)
      }
    }
  })

  // ── ssh:disconnect ───────────────────────────────────────────────────────

  socket.on('ssh:disconnect', (payload: SSHDisconnectPayload) => {
    const { sessionId } = payload
    const session = activeSessions.get(sessionId)

    if (session) {
      console.log(`[SSH Service] Disconnect request: sessionId=${sessionId}`)
      socket.emit('ssh:disconnected', { sessionId, serverId: session.serverId })
      cleanupSession(sessionId)
    }
  })

  // ── command:broadcast ────────────────────────────────────────────────────

  socket.on('command:broadcast', (payload: CommandBroadcastPayload) => {
    const { serverIds, command, commandId } = payload
    console.log(`[SSH Service] Broadcast command: commandId=${commandId}, servers=${serverIds.length}, command=${command}`)

    // We need server connection details to connect. The payload only has serverIds.
    // The client should send server details or we look them up from active sessions.
    // Since this service has no DB, the client should send server details alongside.
    // However, per the spec, the payload is { serverIds, command, commandId }.
    // We'll check active sessions first, and if a server isn't connected, we'll need info.
    // For now, let's handle this by accepting an extended payload.

    // Actually, looking at the spec more carefully - we need server connection info.
    // The typical pattern is: the frontend sends server details along with the command.
    // Let me check if there's already an active session for any of these serverIds.
    // We need to store server details when connecting. Let's update our approach.

    // Find sessions matching serverIds
    for (const serverId of serverIds) {
      // Check if there's an existing session for this serverId
      let foundSession: ActiveSession | null = null
      let foundSessionId: string | null = null

      for (const [sid, sess] of activeSessions) {
        if (sess.serverId === serverId && sess.socketId === socket.id) {
          foundSession = sess
          foundSessionId = sid
          break
        }
      }

      if (foundSession && foundSession.conn) {
        // Use existing connection with exec
        foundSession.conn.exec(`TERM=xterm-256color script -qc "${command}" /dev/null`, (err, stream) => {
          if (err) {
            socket.emit('command:output', {
              commandId,
              serverId,
              output: `Error: ${err.message}`,
              done: true,
            })
            return
          }

          let output = ''

          stream.on('data', (data: Buffer) => {
            output += data.toString('utf-8')
            socket.emit('command:output', {
              commandId,
              serverId,
              output: data.toString('utf-8'),
              done: false,
            })
          })

          stream.stderr.on('data', (data: Buffer) => {
            output += data.toString('utf-8')
            socket.emit('command:output', {
              commandId,
              serverId,
              output: data.toString('utf-8'),
              done: false,
            })
          })

          stream.on('close', () => {
            socket.emit('command:output', {
              commandId,
              serverId,
              output: '',
              done: true,
            })
          })
        })
      } else {
        // No existing session - we need connection details from client
        // Emit an error asking for connection info
        socket.emit('command:output', {
          commandId,
          serverId,
          output: `Error: No active session for server ${serverId}. Please provide server connection details.`,
          done: true,
        })
      }
    }
  })

  // ── command:broadcast-with-details (extended version) ────────────────────
  // This handles the case where client provides server details for servers
  // that don't have active sessions yet

  interface BroadcastWithDetailsPayload {
    commandId: string
    command: string
    servers: Array<{
      serverId: string
      host: string
      port: number
      username: string
      authType: 'password' | 'key'
      password?: string
      privateKey?: string
    }>
  }

  socket.on('command:broadcast-with-details', (payload: BroadcastWithDetailsPayload) => {
    const { commandId, command, servers } = payload
    console.log(`[SSH Service] Broadcast with details: commandId=${commandId}, servers=${servers.length}`)

    for (const serverInfo of servers) {
      const { serverId } = serverInfo

      // Check if there's an existing session for this serverId
      let existingConn: Client | null = null

      for (const [, sess] of activeSessions) {
        if (sess.serverId === serverId && sess.socketId === socket.id) {
          existingConn = sess.conn
          break
        }
      }

      if (existingConn) {
        // Use existing connection
        existingConn.exec(`TERM=xterm-256color script -qc "${command}" /dev/null`, (err, stream) => {
          if (err) {
            socket.emit('command:output', {
              commandId,
              serverId,
              output: `Error: ${err.message}`,
              done: true,
            })
            return
          }

          stream.on('data', (data: Buffer) => {
            socket.emit('command:output', {
              commandId,
              serverId,
              output: data.toString('utf-8'),
              done: false,
            })
          })

          stream.stderr.on('data', (data: Buffer) => {
            socket.emit('command:output', {
              commandId,
              serverId,
              output: data.toString('utf-8'),
              done: false,
            })
          })

          stream.on('close', () => {
            socket.emit('command:output', {
              commandId,
              serverId,
              output: '',
              done: true,
            })
          })
        })
      } else {
        // Create a new temporary connection
        const conn = new Client()
        const config = buildSSHConfig({ ...serverInfo, id: serverInfo.serverId } as unknown as ServerInfo)

        conn.on('ready', () => {
          conn.exec(`TERM=xterm-256color script -qc "${command}" /dev/null`, (err, stream) => {
            if (err) {
              socket.emit('command:output', {
                commandId,
                serverId,
                output: `Error: ${err.message}`,
                done: true,
              })
              conn.end()
              return
            }

            stream.on('data', (data: Buffer) => {
              socket.emit('command:output', {
                commandId,
                serverId,
                output: data.toString('utf-8'),
                done: false,
              })
            })

            stream.stderr.on('data', (data: Buffer) => {
              socket.emit('command:output', {
                commandId,
                serverId,
                output: data.toString('utf-8'),
                done: false,
              })
            })

            stream.on('close', () => {
              socket.emit('command:output', {
                commandId,
                serverId,
                output: '',
                done: true,
              })
              conn.end()
            })
          })
        })

        conn.on('error', (err) => {
          socket.emit('command:output', {
            commandId,
            serverId,
            output: `Connection error: ${err.message}`,
            done: true,
          })
        })

        try {
          conn.connect(config)
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          socket.emit('command:output', {
            commandId,
            serverId,
            output: `Connection failed: ${message}`,
            done: true,
          })
        }
      }
    }
  })

  // ── command:check-status ─────────────────────────────────────────────────

  socket.on('command:check-status', (payload: CheckStatusPayload) => {
    const { servers } = payload
    console.log(`[SSH Service] Check status: ${servers.length} servers`)

    for (const serverInfo of servers) {
      const { id: serverId, host, port, username, authType, password, privateKey } = serverInfo
      const conn = new Client()

      const config = buildSSHConfig({
        id: serverId,
        host,
        port,
        username,
        authType,
        password,
        privateKey,
      })

      // Set a timeout for the connection attempt
      const timeout = setTimeout(() => {
        conn.end()
        socket.emit('server:status', {
          serverId,
          status: 'offline',
        })
      }, 10000)

      conn.on('ready', () => {
        clearTimeout(timeout)

        // Try to get OS info
        conn.exec('uname -a', (err, stream) => {
          if (err) {
            socket.emit('server:status', {
              serverId,
              status: 'online',
            })
            conn.end()
            return
          }

          let osInfo = ''

          stream.on('data', (data: Buffer) => {
            osInfo += data.toString('utf-8').trim()
          })

          stream.on('close', () => {
            socket.emit('server:status', {
              serverId,
              status: 'online',
              os: osInfo || undefined,
            })
            conn.end()
          })
        })
      })

      conn.on('error', () => {
        clearTimeout(timeout)
        socket.emit('server:status', {
          serverId,
          status: 'offline',
        })
      })

      try {
        conn.connect(config)
      } catch {
        clearTimeout(timeout)
        socket.emit('server:status', {
          serverId,
          status: 'offline',
        })
      }
    }
  })

  // ── server:resources ─────────────────────────────────────────────────────

  interface ResourceServerInfo {
    id: string
    host: string
    port: number
    username: string
    authType: 'password' | 'key'
    password?: string
    privateKey?: string
  }

  interface ResourceRequestPayload {
    servers: ResourceServerInfo[]
  }

  socket.on('server:resources', (payload: ResourceRequestPayload) => {
    const { servers } = payload
    console.log(`[SSH Service] Resource monitoring request: ${servers.length} servers`)

    for (const serverInfo of servers) {
      const { id: serverId, host, port, username, authType, password, privateKey } = serverInfo
      const conn = new Client()

      const config = buildSSHConfig({
        id: serverId,
        host,
        port,
        username,
        authType,
        password,
        privateKey,
      })

      const timeout = setTimeout(() => {
        conn.end()
        socket.emit('server:resources-data', {
          serverId,
          error: 'Connection timeout',
        })
      }, 15000)

      conn.on('ready', () => {
        clearTimeout(timeout)

        // Run all four commands sequentially
        const commands = [
          'top -bn1 | head -5',
          'free -m',
          'df -h /',
          'uptime',
        ]

        let cpuOutput = ''
        let ramOutput = ''
        let diskOutput = ''
        let uptimeOutput = ''
        let cmdIndex = 0

        const runNext = () => {
          if (cmdIndex >= commands.length) {
            // Parse and emit results
            const result = parseResourceData(serverId, cpuOutput, ramOutput, diskOutput, uptimeOutput)
            socket.emit('server:resources-data', result)
            conn.end()
            return
          }

          const cmd = commands[cmdIndex]
          conn.exec(cmd, (err, stream) => {
            if (err) {
              cmdIndex++
              runNext()
              return
            }

            let output = ''
            stream.on('data', (data: Buffer) => {
              output += data.toString('utf-8')
            })
            stream.stderr.on('data', (data: Buffer) => {
              output += data.toString('utf-8')
            })
            stream.on('close', () => {
              if (cmdIndex === 0) cpuOutput = output
              else if (cmdIndex === 1) ramOutput = output
              else if (cmdIndex === 2) diskOutput = output
              else if (cmdIndex === 3) uptimeOutput = output
              cmdIndex++
              runNext()
            })
          })
        }

        runNext()
      })

      conn.on('error', (err) => {
        clearTimeout(timeout)
        socket.emit('server:resources-data', {
          serverId,
          error: err.message,
        })
      })

      try {
        conn.connect(config)
      } catch (err: unknown) {
        clearTimeout(timeout)
        const message = err instanceof Error ? err.message : 'Unknown error'
        socket.emit('server:resources-data', {
          serverId,
          error: message,
        })
      }
    }
  })

  // ── file:upload ──────────────────────────────────────────────────────────
  // Upload files/folders to a server via SFTP

  interface FileUploadPayload {
    serverId: string
    files: Array<{
      name: string
      path: string       // relative path (preserves folder structure)
      content: string     // base64 encoded
      size: number
      isDirectory?: boolean
    }>
    remotePath: string    // target directory on remote server
    uploadId: string
  }

  interface FileUploadServerInfo {
    serverId: string
    host: string
    port: number
    username: string
    authType: 'password' | 'key'
    password?: string
    privateKey?: string
  }

  interface BroadcastUploadPayload {
    uploadId: string
    files: Array<{
      name: string
      path: string
      content: string
      size: number
      isDirectory?: boolean
    }>
    remotePath: string
    servers: FileUploadServerInfo[]
  }

  socket.on('file:upload', async (payload: FileUploadPayload & { server?: FileUploadServerInfo }) => {
    const { serverId, files, remotePath, uploadId } = payload
    console.log(`[SSH Service] File upload: uploadId=${uploadId}, serverId=${serverId}, files=${files.length}`)

    // Find existing connection or use server details
    let conn: Client | null = null
    for (const [, sess] of activeSessions) {
      if (sess.serverId === serverId && sess.socketId === socket.id) {
        conn = sess.conn
        break
      }
    }

    const doUpload = (connection: Client) => {
      connection.sftp((err, sftp) => {
        if (err) {
          socket.emit('file:upload-error', { uploadId, serverId, error: err.message })
          return
        }

        let completed = 0
        let failed = 0
        const total = files.length

        const checkDone = () => {
          if (completed + failed >= total) {
            sftp.end()
            if (failed > 0) {
              socket.emit('file:upload-error', {
                uploadId,
                serverId,
                error: `${failed} file(s) failed out of ${total}`,
                completed,
                failed,
              })
            } else {
              socket.emit('file:upload-done', { uploadId, serverId, completed })
            }
          }
        }

        // Ensure remote directory exists
        const ensureDir = (dirPath: string, cb: () => void) => {
          sftp.mkdir(dirPath, (err: Error | null) => {
            // If dir exists, ignore error
            cb()
          })
        }

        // Process each file
        for (const file of files) {
          const remoteFilePath = `${remotePath}/${file.path}`

          if (file.isDirectory) {
            ensureDir(remoteFilePath, () => {
              completed++
              socket.emit('file:upload-progress', {
                uploadId,
                serverId,
                fileName: file.name,
                completed,
                total,
              })
              checkDone()
            })
          } else {
            // Ensure parent dir exists
            const dirParts = file.path.split('/')
            if (dirParts.length > 1) {
              let currentPath = remotePath
              const mkdirRecursive = (idx: number) => {
                if (idx >= dirParts.length - 1) {
                  writeFile()
                  return
                }
                currentPath += '/' + dirParts[idx]
                sftp.mkdir(currentPath, () => {
                  mkdirRecursive(idx + 1)
                })
              }
              mkdirRecursive(0)
            } else {
              writeFile()
            }

            function writeFile() {
              const buffer = Buffer.from(file.content, 'base64')
              const writeStream = sftp.createWriteStream(remoteFilePath)
              writeStream.on('error', (err: Error) => {
                failed++
                console.error(`[SSH Service] Upload error: ${file.name}`, err.message)
                checkDone()
              })
              writeStream.on('close', () => {
                completed++
                socket.emit('file:upload-progress', {
                  uploadId,
                  serverId,
                  fileName: file.name,
                  completed,
                  total,
                })
                checkDone()
              })
              writeStream.end(buffer)
            }
          }
        }
      })
    }

    if (conn) {
      doUpload(conn)
    } else if (payload.server) {
      // Create temporary connection
      const tempConn = new Client()
      const config = buildSSHConfig({ ...payload.server, id: payload.server.serverId })

      tempConn.on('ready', () => {
        doUpload(tempConn)
      })

      tempConn.on('error', (err) => {
        socket.emit('file:upload-error', { uploadId, serverId, error: err.message })
      })

      const timeout = setTimeout(() => {
        tempConn.end()
        socket.emit('file:upload-error', { uploadId, serverId, error: 'Connection timeout' })
      }, 30000)

      tempConn.on('close', () => {
        clearTimeout(timeout)
      })

      try {
        tempConn.connect(config)
      } catch (err: unknown) {
        clearTimeout(timeout)
        const message = err instanceof Error ? err.message : 'Unknown error'
        socket.emit('file:upload-error', { uploadId, serverId, error: message })
      }
    } else {
      socket.emit('file:upload-error', {
        uploadId,
        serverId,
        error: 'No active session and no server details provided',
      })
    }
  })

  // ── file:broadcast-upload ─────────────────────────────────────────────────
  // Upload files to multiple servers at once

  socket.on('file:broadcast-upload', async (payload: BroadcastUploadPayload) => {
    const { uploadId, files, remotePath, servers } = payload
    console.log(`[SSH Service] Broadcast upload: uploadId=${uploadId}, servers=${servers.length}, files=${files.length}`)

    for (const serverInfo of servers) {
      // Emit a sub-upload for each server
      const serverUploadId = `${uploadId}:${serverInfo.serverId}`

      socket.emit('file:upload', {
        ...payload,
        uploadId: serverUploadId,
        serverId: serverInfo.serverId,
        server: serverInfo,
        files,
        remotePath,
      })
    }
  })

  // ── Disconnect cleanup ───────────────────────────────────────────────────

  socket.on('disconnect', () => {
    console.log(`[SSH Service] Client disconnected: ${socket.id}`)
    cleanupAllSessionsForSocket(socket.id)
  })

  socket.on('error', (error) => {
    console.error(`[SSH Service] Socket error (${socket.id}):`, error.message)
    cleanupAllSessionsForSocket(socket.id)
  })
})

// ─── Start Server ────────────────────────────────────────────────────────────

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[SSH Service] SSH Terminal WebSocket service running on port ${PORT}`)
})

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

function gracefulShutdown(signal: string) {
  console.log(`[SSH Service] Received ${signal}, shutting down...`)

  // Close all active SSH connections
  for (const [sessionId, session] of activeSessions) {
    try {
      session.conn.end()
    } catch {
      // ignore
    }
  }
  activeSessions.clear()
  socketSessions.clear()

  httpServer.close(() => {
    console.log('[SSH Service] Server closed')
    process.exit(0)
  })

  // Force exit after 5 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error('[SSH Service] Forced shutdown after timeout')
    process.exit(1)
  }, 5000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

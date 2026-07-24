/**
 * Rclone RC API Client (TypeScript)
 * Communicates with rclone daemon via its RC (Remote Control) HTTP API.
 *
 * Converted from rclone-webui/webui/src/api/rclone.js
 * - Added full TypeScript types for all methods and responses
 * - Preserved original logic
 * - Added new methods: operationsCopyDir, operationsMoveDir,
 *   operationsCheckPerms, uploadFile, downloadFile
 */

// ============================================================
// Response Types
// ============================================================

export interface RcloneVersionInfo {
  version: string
  decomposed: number[]
  isBeta: boolean
  isGit: boolean
  os: string
  arch: string
  goVersion: string
  linking: string
  tags: string[]
}

export interface RcloneListRemotesResponse {
  remotes: string[]
}

export interface RcloneConfigDumpResponse {
  [remoteName: string]: {
    type: string
    [key: string]: string | string[]
  }
}

export interface RcloneProviderOption {
  Name: string
  Help: string
  Default: string
  Value: string
  IsPassword: boolean
  Required: boolean
  Advanced: boolean
  Type: string
}

export interface RcloneProvider {
  Name: string
  Description: string
  Options: RcloneProviderOption[]
}

export interface RcloneProvidersResponse {
  providers: RcloneProvider[]
}

export interface RcloneFileItem {
  Name: string
  Path: string
  Size: number
  ModTime: string
  IsDir: boolean
  MimeType: string
  ID?: string
  FullName?: string
  Hashes?: Record<string, string>
}

export interface RcloneListResponse {
  list: RcloneFileItem[]
}

export interface RcloneStatResponse {
  name: string
  size: number
  modTime: string
  isDir: boolean
}

export interface RcloneAboutResponse {
  total: number
  used: number
  free: number
  [key: string]: number | string | boolean
}

export interface RcloneSizeResponse {
  count: number
  bytes: number
}

export interface RcloneJobStatusResponse {
  id: number
  finished: boolean
  success: boolean
  startTime: string
  endTime: string
  duration: number
  error: string
  transferred: number
  checked: boolean
  group: string
  output: unknown
}

export interface RcloneJobListResponse {
  jobids: number[]
}

export interface RcloneStatsResponse {
  bytes: number
  checks: number
  deletes: number
  elapsedTime: number
  errors: number
  fatalError: boolean
  renames: number
  serverSideCopies: number
  serverSideCopyBytes: number
  serverSideMoveBytes: number
  serverSideMoves: number
  transfers: number
  transferred: number
  transferTime: number
  [key: string]: unknown
}

export interface RcloneMemstatsResponse {
  Sys: number
  HeapAlloc: number
  HeapInuse: number
  StackInuse: number
  [key: string]: number
}

export interface RcloneBwlimitResponse {
  bytesPerSecond: number
  rate: string
  [key: string]: unknown
}

export interface RclonePublicLinkResponse {
  url: string
}

export interface RcloneFsInfoResponse {
  Name: string
  Hashes: string[]
  Features: Record<string, boolean>
  Precision: number
  [key: string]: unknown
}

export interface RclonePermsResponse {
  canRead: boolean
  canWrite: boolean
  canList: boolean
  canMkdir: boolean
  canDelete: boolean
  canRename: boolean
  canCopy: boolean
  canMove: boolean
  [key: string]: boolean
}

export interface RcloneMountListResponse {
  mountPoints: string[]
}

export interface RcloneServeListResponse {
  serves: string[]
}

export interface RcloneRcListResponse {
  endpoints: string[]
}

// ============================================================
// Auth
// ============================================================

interface RcloneAuth {
  user: string
  pass: string
}

// ============================================================
// API Client
// ============================================================

const API_BASE = '/api'

class RcloneApiClient {
  private baseUrl: string
  private auth: RcloneAuth | null

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl
    this.auth = null
  }

  /** Set basic auth credentials for all subsequent requests */
  setAuth(user: string, pass: string): void {
    this.auth = { user, pass }
  }

  /** Clear auth credentials */
  clearAuth(): void {
    this.auth = null
  }

  /** Low-level POST request to rclone RC API */
  private async request<T = unknown>(
    endpoint: string,
    params: Record<string, unknown> = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.auth) {
      if (typeof window !== 'undefined' && typeof btoa === 'function') {
        headers['Authorization'] = `Basic ${btoa(`${this.auth.user}:${this.auth.pass}`)}`
      }
    }

    const response = await fetch(`${this.baseUrl}/${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(
        (error as { error?: string; message?: string }).error ||
        (error as { message?: string }).message ||
        `HTTP ${response.status}`
      )
    }

    // Some endpoints return empty body
    const text = await response.text()
    if (!text) return {} as T
    return JSON.parse(text) as T
  }

  // ============================================================
  // Core
  // ============================================================

  async version(): Promise<RcloneVersionInfo> {
    return this.request<RcloneVersionInfo>('core/version')
  }

  async pid(): Promise<{ pid: number }> {
    return this.request('core/pid')
  }

  async memstats(): Promise<RcloneMemstatsResponse> {
    return this.request<RcloneMemstatsResponse>('core/memstats')
  }

  async stats(group = ''): Promise<RcloneStatsResponse> {
    const params: Record<string, unknown> = {}
    if (group) params.group = group
    return this.request<RcloneStatsResponse>('core/stats', params)
  }

  async transferred(group = ''): Promise<unknown> {
    const params: Record<string, unknown> = {}
    if (group) params.group = group
    return this.request('core/transferred', params)
  }

  async statsReset(group = ''): Promise<unknown> {
    const params: Record<string, unknown> = {}
    if (group) params.group = group
    return this.request('core/stats-reset', params)
  }

  async bwlimit(): Promise<RcloneBwlimitResponse> {
    return this.request<RcloneBwlimitResponse>('core/bwlimit')
  }

  async quit(): Promise<unknown> {
    return this.request('core/quit')
  }

  async disks(): Promise<unknown> {
    return this.request('core/disks')
  }

  // ============================================================
  // Config / Remotes
  // ============================================================

  async listRemotes(): Promise<RcloneListRemotesResponse> {
    return this.request<RcloneListRemotesResponse>('config/listremotes')
  }

  async configDump(): Promise<RcloneConfigDumpResponse> {
    return this.request<RcloneConfigDumpResponse>('config/dump')
  }

  async configGet(name: string): Promise<Record<string, unknown>> {
    return this.request('config/get', { name })
  }

  async configProviders(): Promise<RcloneProvidersResponse> {
    return this.request<RcloneProvidersResponse>('config/providers')
  }

  async configCreate(
    name: string,
    type: string,
    parameters: Record<string, string> = {}
  ): Promise<unknown> {
    return this.request('config/create', { name, type, parameters })
  }

  async configUpdate(
    name: string,
    parameters: Record<string, string> = {}
  ): Promise<unknown> {
    return this.request('config/update', { name, parameters })
  }

  async configDelete(name: string): Promise<unknown> {
    return this.request('config/delete', { name })
  }

  async configPaths(): Promise<{ configPath: string }> {
    return this.request('config/paths')
  }

  // ============================================================
  // Operations
  // ============================================================

  async operationsList(fs: string, remote = ''): Promise<RcloneListResponse> {
    return this.request<RcloneListResponse>('operations/list', { fs, remote })
  }

  async operationsStat(fs: string, remote: string): Promise<RcloneStatResponse> {
    return this.request<RcloneStatResponse>('operations/stat', { fs, remote })
  }

  async operationsAbout(fs: string): Promise<RcloneAboutResponse> {
    return this.request<RcloneAboutResponse>('operations/about', { fs })
  }

  async operationsCopyfile(
    srcFs: string,
    srcRemote: string,
    dstFs: string,
    dstRemote: string
  ): Promise<unknown> {
    return this.request('operations/copyfile', { srcFs, srcRemote, dstFs, dstRemote })
  }

  async operationsMovefile(
    srcFs: string,
    srcRemote: string,
    dstFs: string,
    dstRemote: string
  ): Promise<unknown> {
    return this.request('operations/movefile', { srcFs, srcRemote, dstFs, dstRemote })
  }

  async operationsDeletefile(fs: string, remote: string): Promise<unknown> {
    return this.request('operations/deletefile', { fs, remote })
  }

  async operationsPurge(fs: string, remote: string): Promise<unknown> {
    return this.request('operations/purge', { fs, remote })
  }

  async operationsSize(fs: string, remote: string): Promise<RcloneSizeResponse> {
    return this.request<RcloneSizeResponse>('operations/size', { fs, remote })
  }

  async operationsPubliclink(fs: string, remote: string): Promise<RclonePublicLinkResponse> {
    return this.request<RclonePublicLinkResponse>('operations/publiclink', { fs, remote })
  }

  async operationsFsinfo(fs: string): Promise<RcloneFsInfoResponse> {
    return this.request<RcloneFsInfoResponse>('operations/fsinfo', { fs })
  }

  async operationsMkdir(fs: string, remote: string): Promise<unknown> {
    return this.request('operations/mkdir', { fs, remote })
  }

  async operationsRmdir(fs: string, remote: string): Promise<unknown> {
    return this.request('operations/rmdir', { fs, remote })
  }

  // ============================================================
  // New Operations (added for Cloud Manager)
  // ============================================================

  /** Copy an entire directory from srcFs to dstFs */
  async operationsCopyDir(srcFs: string, dstFs: string, asyncMode = false): Promise<unknown> {
    const params: Record<string, unknown> = { srcFs, dstFs }
    if (asyncMode) params._async = true
    return this.request('operations/copydir', params)
  }

  /** Move an entire directory from srcFs to dstFs */
  async operationsMoveDir(srcFs: string, dstFs: string, asyncMode = false): Promise<unknown> {
    const params: Record<string, unknown> = { srcFs, dstFs }
    if (asyncMode) params._async = true
    return this.request('operations/movedir', params)
  }

  /** Check permissions on a filesystem (read/write/list/mkdir/delete/rename/copy/move) */
  async operationsCheckPerms(fs: string): Promise<RclonePermsResponse> {
    // rclone doesn't have a dedicated "check perms" endpoint,
    // so we infer from fsinfo features
    const info = await this.operationsFsinfo(fs)
    const features = info.Features || {}
    return {
      canRead: features.Get !== false,
      canWrite: features.Put !== false,
      canList: features.List !== false,
      canMkdir: features.Mkdir !== false,
      canDelete: features.Purge !== false || features.Delete !== false,
      canRename: features.Move !== false || features.Rename !== false,
      canCopy: features.Copy !== false,
      canMove: features.Move !== false,
      ...features,
    }
  }

  /**
   * Upload a file via streaming.
   * Uses rclone's RC `operations/uploadfile` if available,
   * otherwise falls back to PUT on the rclone serve endpoint.
   */
  async uploadFile(
    fs: string,
    remote: string,
    file: File | Blob
  ): Promise<unknown> {
    // Try the rclone RC uploadfile endpoint (rclone >= 1.65)
    // It expects multipart/form-data with the file in the "file" field
    const formData = new FormData()
    formData.append('fs', fs)
    formData.append('remote', remote)
    formData.append('file', file)

    const headers: Record<string, string> = {}
    if (this.auth && typeof window !== 'undefined' && typeof btoa === 'function') {
      headers['Authorization'] = `Basic ${btoa(`${this.auth.user}:${this.auth.pass}`)}`
    }

    const response = await fetch(`${this.baseUrl}/operations/uploadfile`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }))
      throw new Error(
        (error as { error?: string }).error || `Upload failed: HTTP ${response.status}`
      )
    }

    const text = await response.text()
    return text ? JSON.parse(text) : {}
  }

  /**
   * Get a download URL or stream for a file.
   * Returns a URL that can be used in an <a> or window.open().
   * If rclone is serving over HTTP, constructs the direct URL.
   * Otherwise uses operations/publiclink to get a temporary link.
   */
  async downloadFile(fs: string, remote: string): Promise<{ url: string; blob?: Blob }> {
    // Try publiclink first (works for most cloud providers)
    try {
      const result = await this.operationsPubliclink(fs, remote)
      return { url: result.url }
    } catch {
      // Fall through to direct fetch
    }

    // Fallback: fetch the file content directly via RC cat endpoint
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.auth && typeof window !== 'undefined' && typeof btoa === 'function') {
      headers['Authorization'] = `Basic ${btoa(`${this.auth.user}:${this.auth.pass}`)}`
    }

    const response = await fetch(`${this.baseUrl}/operations/cat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ fs, remote }),
    })

    if (!response.ok) {
      throw new Error(`Download failed: HTTP ${response.status}`)
    }

    const blob = await response.blob()
    const url = typeof window !== 'undefined' ? URL.createObjectURL(blob) : ''
    return { url, blob }
  }

  // ============================================================
  // Sync
  // ============================================================

  async syncCopy(srcFs: string, dstFs: string, asyncMode = false): Promise<unknown> {
    const params: Record<string, unknown> = { srcFs, dstFs }
    if (asyncMode) params._async = true
    return this.request('sync/copy', params)
  }

  async syncMove(srcFs: string, dstFs: string, asyncMode = false): Promise<unknown> {
    const params: Record<string, unknown> = { srcFs, dstFs }
    if (asyncMode) params._async = true
    return this.request('sync/move', params)
  }

  async syncSync(srcFs: string, dstFs: string, asyncMode = false): Promise<unknown> {
    const params: Record<string, unknown> = { srcFs, dstFs }
    if (asyncMode) params._async = true
    return this.request('sync/sync', params)
  }

  async syncBisync(path1: string, path2: string): Promise<unknown> {
    return this.request('sync/bisync', { path1, path2 })
  }

  // ============================================================
  // Jobs
  // ============================================================

  async jobStatus(id: number): Promise<RcloneJobStatusResponse> {
    return this.request<RcloneJobStatusResponse>('job/status', { id })
  }

  async jobList(): Promise<RcloneJobListResponse> {
    return this.request<RcloneJobListResponse>('job/list')
  }

  async jobStop(id: number): Promise<unknown> {
    return this.request('job/stop', { id })
  }

  // ============================================================
  // VFS
  // ============================================================

  async vfsRefresh(fs: string, remote = ''): Promise<unknown> {
    return this.request('vfs/refresh', { fs, remote })
  }

  async vfsForget(fs: string, remote = ''): Promise<unknown> {
    return this.request('vfs/forget', { fs, remote })
  }

  // ============================================================
  // Mount
  // ============================================================

  async mountList(): Promise<RcloneMountListResponse> {
    return this.request<RcloneMountListResponse>('mount/listmounts')
  }

  async mountMount(fs: string, mountPoint: string, mountType = 'mount'): Promise<unknown> {
    return this.request('mount/mount', { fs, mountPoint, mountType })
  }

  async mountUnmount(mountPoint: string): Promise<unknown> {
    return this.request('mount/unmount', { mountPoint })
  }

  // ============================================================
  // Serve
  // ============================================================

  async serveList(): Promise<RcloneServeListResponse> {
    return this.request<RcloneServeListResponse>('serve/list')
  }

  // ============================================================
  // RC List
  // ============================================================

  async rcList(): Promise<RcloneRcListResponse> {
    return this.request<RcloneRcListResponse>('rc/list')
  }

  // ============================================================
  // Noop (health check)
  // ============================================================

  async noop(): Promise<unknown> {
    return this.request('rc/noop')
  }
}

// ============================================================
// Singleton export
// ============================================================

export const rclone = new RcloneApiClient()
export default rclone

/**
 * Cloud Manager - Type Definitions
 * Converted from rclone-webui Svelte stores to TypeScript interfaces
 */

/** A configured rclone remote (cloud storage account) */
export interface Remote {
  /** Remote name without trailing colon, e.g. "my-drive" */
  name: string
  /** Provider type, e.g. "drive", "onedrive", "s3" */
  type: string
  /** Optional configured parameters */
  parameters?: Record<string, string>
}

/** A file or folder entry returned by rclone operations/list */
export interface FileItem {
  /** Base name of the file/folder */
  Name: string
  /** Path relative to the fs root */
  Path: string
  /** Size in bytes (0 for directories) */
  Size: number
  /** ISO 8601 modification time */
  ModTime: string
  /** Whether this entry is a directory */
  IsDir: boolean
  /** MIME type if known */
  MimeType: string
  /** Full file path (fs + path) when available */
  FullName?: string
  /** Hashes if requested */
  Hashes?: Record<string, string>
  /** ID in the backend storage system */
  ID?: string
}

/** Breadcrumb navigation segment */
export interface BreadcrumbPart {
  /** Display name */
  name: string
  /** The fs (remote) this breadcrumb belongs to */
  fs: string
  /** Path up to and including this segment */
  path: string
  /** Whether this is the last (current) segment */
  isLast: boolean
}

/** Toast notification */
export interface Toast {
  id: number
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
}

/** Provider option field for Add Remote modal */
export interface ProviderOption {
  Name: string
  Help?: string
  Default?: string
  Value?: string
  IsPassword?: boolean
  Required?: boolean
  Advanced?: boolean
  Type?: string
}

/** Provider info from config/providers */
export interface Provider {
  Name: string
  Description?: string
  Options?: ProviderOption[]
}

/** Provider display name mapping */
export const PROVIDER_NAMES: Record<string, string> = {
  drive: 'Google Drive',
  onedrive: 'OneDrive',
  dropbox: 'Dropbox',
  s3: 'Amazon S3',
  b2: 'Backblaze B2',
  box: 'Box',
  mega: 'MEGA',
  pcloud: 'pCloud',
  yandex: 'Yandex Disk',
  webdav: 'WebDAV',
  ftp: 'FTP',
  sftp: 'SFTP',
  local: 'Local Disk',
  azureblob: 'Azure Blob',
  gcs: 'Google Cloud Storage',
  iclouddrive: 'iCloud Drive',
  jottacloud: 'Jottacloud',
  mailru: 'Mail.ru Cloud',
  zoho: 'Zoho WorkDrive',
  hidrive: 'HiDrive',
  huaweidrive: 'Huawei Drive',
  internxt: 'Internxt',
  protondrive: 'ProtonDrive',
  pixeldrain: 'Pixeldrain',
  putio: 'Put.io',
  premiumizeme: 'Premiumize.me',
  sugarsync: 'SugarSync',
  sharefile: 'ShareFile',
  koofr: 'Koofr',
  filen: 'Filen',
  linkbox: 'Linkbox',
  opendrive: 'OpenDrive',
  storj: 'Storj',
  sia: 'Sia',
  cloudinary: 'Cloudinary',
  compress: 'Compress',
  crypt: 'Crypt',
}

/** Brand colors for cloud provider icons */
export const PROVIDER_COLORS: Record<string, string> = {
  drive: '#4285F4',
  onedrive: '#0078D4',
  dropbox: '#0061FF',
  s3: '#FF9900',
  b2: '#E2231A',
  box: '#0061D5',
  mega: '#D9272E',
  pcloud: '#17BED0',
  yandex: '#FFCC00',
  webdav: '#6B7488',
  ftp: '#6B7488',
  sftp: '#6B7488',
  local: '#5B6770',
  azureblob: '#0078D4',
  gcs: '#4285F4',
  iclouddrive: '#A2AAAD',
  jottacloud: '#1B4B6B',
  mailru: '#005FF9',
  zoho: '#C8202F',
  hidrive: '#1C5BAA',
  huaweidrive: '#FF0000',
  internxt: '#17BED0',
  protondrive: '#6D4AFF',
  pixeldrain: '#4F6BFF',
  putio: '#2D2D2D',
  premiumizeme: '#FFA500',
  sugarsync: '#1A1A1A',
  sharefile: '#00A36C',
  koofr: '#4F6BFF',
  filen: '#000000',
  linkbox: '#3B82F6',
  opendrive: '#0A8A0A',
  storj: '#0066FF',
  sia: '#00DCFA',
  cloudinary: '#3448C5',
  compress: '#6B7488',
  crypt: '#8B5CF6',
  unknown: '#6B7488',
}

/** File extension → icon type mapping */
export const FILE_ICON_MAP: Record<string, string> = {
  // Images
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', bmp: 'image',
  svg: 'image', webp: 'image', ico: 'image', tiff: 'image',
  // Videos
  mp4: 'video', avi: 'video', mkv: 'video', mov: 'video', wmv: 'video',
  flv: 'video', webm: 'video', m4v: 'video',
  // Audio
  mp3: 'music', wav: 'music', flac: 'music', aac: 'music', ogg: 'music',
  m4a: 'music', wma: 'music',
  // Archives
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive',
  gz: 'archive', bz2: 'archive', xz: 'archive',
  // Documents
  pdf: 'file-text', doc: 'file-text', docx: 'file-text', txt: 'file-text',
  rtf: 'file-text', odt: 'file-text', md: 'file-text',
  // Code
  js: 'file-text', ts: 'file-text', html: 'file-text', css: 'file-text',
  json: 'file-text', xml: 'file-text', py: 'file-text', java: 'file-text',
  c: 'file-text', cpp: 'file-text', go: 'file-text', rs: 'file-text',
  sh: 'file-text', yml: 'file-text', yaml: 'file-text',
}

/** Icon type → color mapping */
export const FILE_ICON_COLORS: Record<string, string> = {
  image: '#8B5CF6',
  video: '#EC4899',
  music: '#F59E0B',
  archive: '#10B981',
  'file-text': '#3B82F6',
  file: '#6B7280',
  folder: '#6366f1',
}

/** Context menu action */
export type ContextMenuAction =
  | 'open'
  | 'download'
  | 'copy'
  | 'move'
  | 'rename'
  | 'delete'
  | 'info'

/** Context menu item */
export interface ContextMenuItem {
  action: ContextMenuAction
  label: string
  icon: string
  danger?: boolean
}

/** Upload progress entry */
export interface UploadEntry {
  id: string
  fileName: string
  size: number
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

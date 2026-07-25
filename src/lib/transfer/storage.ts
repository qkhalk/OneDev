import { promises as fs } from 'fs'
import path from 'path'

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads')
const CHUNKS_DIR = path.join(UPLOADS_ROOT, 'chunks')
const FILES_DIR = path.join(UPLOADS_ROOT, 'files')

/** Ensure a directory exists, create if missing */
async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
}

/** Get the chunk directory path for an upload session */
export function getChunkDir(uploadId: string): string {
  return path.join(CHUNKS_DIR, uploadId)
}

/** Get the chunk file path for a specific chunk index */
export function getChunkPath(uploadId: string, chunkIndex: number): string {
  return path.join(getChunkDir(uploadId), `chunk-${chunkIndex}`)
}

/** Get the final merged file path */
export function getFilePath(fileId: string, filename: string): string {
  // Sanitize filename to prevent path traversal
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  return path.join(FILES_DIR, `${fileId}-${safeName}`)
}

/** Save a single chunk to disk */
export async function saveChunk(
  uploadId: string,
  chunkIndex: number,
  data: Buffer
): Promise<void> {
  const chunkDir = getChunkDir(uploadId)
  await ensureDir(chunkDir)
  const chunkPath = getChunkPath(uploadId, chunkIndex)
  await fs.writeFile(chunkPath, data)
}

/** Merge all chunks into a single file, then clean up chunk directory */
export async function mergeChunks(
  uploadId: string,
  totalChunks: number,
  fileId: string,
  filename: string
): Promise<string> {
  await ensureDir(FILES_DIR)
  const filePath = getFilePath(fileId, filename)

  // Write chunks in order
  const writeHandle = await fs.open(filePath, 'w')
  try {
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = getChunkPath(uploadId, i)
      try {
        const chunkData = await fs.readFile(chunkPath)
        await writeHandle.write(chunkData)
      } catch (err) {
        throw new Error(`Missing chunk ${i} for upload ${uploadId}: ${err}`)
      }
    }
  } finally {
    await writeHandle.close()
  }

  // Clean up chunk directory
  await deleteChunkDir(uploadId)

  return filePath
}

/** Delete the chunk directory for an upload session */
export async function deleteChunkDir(uploadId: string): Promise<void> {
  const chunkDir = getChunkDir(uploadId)
  try {
    await fs.rm(chunkDir, { recursive: true, force: true })
  } catch {
    // ignore — directory may not exist
  }
}

/** Delete a merged file from disk */
export async function deleteFile(fileId: string, filename: string): Promise<void> {
  const filePath = getFilePath(fileId, filename)
  try {
    await fs.unlink(filePath)
  } catch {
    // ignore — file may not exist
  }
}

/** Check if a file exists on disk */
export async function fileExists(fileId: string, filename: string): Promise<boolean> {
  const filePath = getFilePath(fileId, filename)
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

/** Read a file as a stream (for download) */
export async function getFileStats(
  fileId: string,
  filename: string
): Promise<{ path: string; size: number } | null> {
  const filePath = getFilePath(fileId, filename)
  try {
    const stats = await fs.stat(filePath)
    return { path: filePath, size: stats.size }
  } catch {
    return null
  }
}

/** Initialize the uploads directory structure */
export async function initStorage(): Promise<void> {
  await ensureDir(CHUNKS_DIR)
  await ensureDir(FILES_DIR)
}

// Constants
export const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024 // 5MB
export const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB

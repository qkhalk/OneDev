import { prisma } from '@/lib/db'
import type { Prompt } from '@prisma/client'

/**
 * Parse a JSON-encoded tags string into a string array.
 * Returns an empty array if parsing fails.
 */
export function parseTags(tagsJson: string): string[] {
  try {
    const parsed = JSON.parse(tagsJson)
    if (Array.isArray(parsed)) {
      return parsed.filter((t) => typeof t === 'string')
    }
    return []
  } catch {
    return []
  }
}

/**
 * Serialize a string array into a JSON-encoded string for SQLite storage.
 */
export function serializeTags(tags: string[]): string {
  return JSON.stringify(tags.map((t) => t.trim()).filter(Boolean))
}

/**
 * Increment the view count of a prompt by 1.
 * Silently fails — only logs errors so it never breaks a request.
 */
export async function incrementViews(promptId: string): Promise<void> {
  try {
    await prisma.prompt.update({
      where: { id: promptId },
      data: { views: { increment: 1 } },
    })
  } catch (error) {
    console.error('[incrementViews]', error)
  }
}

/**
 * Get trending prompts: most viewed within the last `days` days.
 * Falls back to all-time most viewed if no recent prompts exist.
 */
export async function getTrendingPrompts(
  days: number = 7,
  limit: number = 10
): Promise<Prompt[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const recent = await prisma.prompt.findMany({
    where: {
      createdAt: { gte: since },
    },
    orderBy: [{ views: 'desc' }, { likes: 'desc' }],
    take: limit,
  })

  // If not enough recent prompts, fall back to all-time most viewed
  if (recent.length < limit) {
    const existingIds = new Set(recent.map((p) => p.id))
    const fallback = await prisma.prompt.findMany({
      where: {
        id: { notIn: Array.from(existingIds) },
      },
      orderBy: [{ views: 'desc' }, { likes: 'desc' }],
      take: limit - recent.length,
    })
    return [...recent, ...fallback]
  }

  return recent
}

/**
 * Valid category list for validation.
 */
export const VALID_CATEGORIES = [
  'general',
  'coding',
  'writing',
  'marketing',
  'design',
  'analysis',
  'roleplay',
  'education',
] as const

export type PromptCategory = (typeof VALID_CATEGORIES)[number]

/**
 * Valid model identifiers.
 */
export const VALID_MODELS = [
  'all',
  'gpt-4',
  'claude',
  'gemini',
  'midjourney',
] as const

export type PromptModel = (typeof VALID_MODELS)[number]

/**
 * Validate that a category string is in the allowed list.
 */
export function isValidCategory(category: string): category is PromptCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(category)
}

/**
 * Validate that a model string is in the allowed list.
 */
export function isValidModel(model: string): model is PromptModel {
  return (VALID_MODELS as readonly string[]).includes(model)
}

/**
 * Normalize pagination params with sensible defaults and caps.
 */
export function normalizePagination(
  page?: string | null,
  limit?: string | null
): { skip: number; take: number; page: number; limit: number } {
  const pageNum = Math.max(1, parseInt(page || '1', 10) || 1)
  const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20))
  return {
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
    page: pageNum,
    limit: limitNum,
  }
}

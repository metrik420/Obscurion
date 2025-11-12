/**
 * FILE: src/lib/import.ts
 * PURPOSE: Parse and validate Markdown files for import into notes.
 * INPUTS: Markdown file content (string) with optional frontmatter.
 * OUTPUTS: Parsed note data with title, content, type, and tags.
 * NOTES: Supports YAML-style frontmatter extraction.
 *        Validates and sanitizes all extracted data.
 */

import { validateNoteTitle, validateNoteContent, validateNoteType } from './validation'

export interface ParsedMarkdownNote {
  title: string
  content: string
  type: string
  tags: string[]
}

/**
 * Parses YAML-style frontmatter from Markdown content.
 * Extracts key-value pairs between --- delimiters.
 *
 * Example:
 * ---
 * title: My Note
 * type: JOURNAL
 * tags: [tag1, tag2]
 * ---
 * Content here...
 *
 * @param markdown - Full Markdown content with frontmatter
 * @returns {frontmatter, content} - Parsed frontmatter object and remaining content
 * @complexity O(n) where n is content length
 */
function parseFrontmatter(markdown: string): {
  frontmatter: Record<string, any>
  content: string
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/

  const match = markdown.match(frontmatterRegex)

  if (!match) {
    // No frontmatter found
    return {
      frontmatter: {},
      content: markdown,
    }
  }

  const frontmatterText = match[1]
  const content = match[2]

  // Parse frontmatter line by line
  const frontmatter: Record<string, any> = {}

  frontmatterText.split('\n').forEach((line) => {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) return

    const key = line.slice(0, colonIndex).trim()
    let value = line.slice(colonIndex + 1).trim()

    // Handle array values: [item1, item2]
    if (value.startsWith('[') && value.endsWith(']')) {
      const items = value
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
      frontmatter[key] = items
    } else {
      frontmatter[key] = value
    }
  })

  return { frontmatter, content }
}

/**
 * Extracts title from Markdown content.
 * Looks for first H1 heading (# Title) or uses filename fallback.
 *
 * @param content - Markdown content
 * @param fallback - Fallback title if none found
 * @returns Extracted title or fallback
 */
function extractTitleFromContent(content: string, fallback: string): string {
  // Look for first H1 heading
  const h1Match = content.match(/^#\s+(.+)$/m)

  if (h1Match) {
    return h1Match[1].trim()
  }

  // Look for first H2 as backup
  const h2Match = content.match(/^##\s+(.+)$/m)

  if (h2Match) {
    return h2Match[1].trim()
  }

  return fallback
}

/**
 * Parses a Markdown file into note data.
 * Extracts frontmatter, title, and content with validation.
 *
 * @param markdown - Full Markdown file content
 * @param filename - Original filename (used as title fallback)
 * @returns ParsedMarkdownNote or null if invalid
 * @throws Never throws - returns null for invalid input
 * @complexity O(n) where n is content length
 *
 * Edge cases:
 * - No frontmatter → extracts title from first heading
 * - No title → uses filename
 * - Invalid type → defaults to 'GENERAL'
 * - No tags → returns empty array
 * - Oversized content → truncated to 1MB
 */
export function parseMarkdownFile(
  markdown: string,
  filename: string
): ParsedMarkdownNote | null {
  if (!markdown || typeof markdown !== 'string' || markdown.trim().length === 0) {
    return null
  }

  // Parse frontmatter
  const { frontmatter, content } = parseFrontmatter(markdown)

  // Extract or derive title
  let title = frontmatter.title || extractTitleFromContent(content, filename)

  // Remove file extension from filename if used as title
  if (title === filename && title.endsWith('.md')) {
    title = title.slice(0, -3)
  }

  // Validate title
  const validatedTitle = validateNoteTitle(title)
  if (!validatedTitle) {
    return null
  }

  // Validate content
  const validatedContent = validateNoteContent(content.trim())
  if (!validatedContent) {
    return null
  }

  // Extract type from frontmatter or default to GENERAL
  const type = validateNoteType(frontmatter.type)

  // Extract tags from frontmatter
  let tags: string[] = []
  if (Array.isArray(frontmatter.tags)) {
    tags = frontmatter.tags
      .filter((tag: any) => typeof tag === 'string' && tag.length > 0)
      .slice(0, 20) // Max 20 tags
  } else if (typeof frontmatter.categories === 'string') {
    tags = [frontmatter.categories]
  } else if (Array.isArray(frontmatter.categories)) {
    tags = frontmatter.categories
      .filter((tag: any) => typeof tag === 'string' && tag.length > 0)
      .slice(0, 20)
  }

  return {
    title: validatedTitle,
    content: validatedContent,
    type,
    tags,
  }
}

/**
 * Validates file size before processing.
 * @param fileSize - File size in bytes
 * @returns boolean - true if within limits
 */
export function isValidFileSize(fileSize: number): boolean {
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  return fileSize > 0 && fileSize <= MAX_FILE_SIZE
}

/**
 * Validates file extension.
 * @param filename - Filename to check
 * @returns boolean - true if valid Markdown extension
 */
export function isMarkdownFile(filename: string): boolean {
  const validExtensions = ['.md', '.markdown', '.mdown', '.mkd']
  return validExtensions.some((ext) => filename.toLowerCase().endsWith(ext))
}

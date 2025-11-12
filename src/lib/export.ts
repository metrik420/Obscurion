/**
 * FILE: src/lib/export.ts
 * PURPOSE: Export utilities for converting notes to Markdown and PDF formats.
 * INPUTS: Note data objects with metadata (title, content, author, dates, etc.).
 * OUTPUTS: Formatted strings (Markdown) or buffers (PDF) ready for download.
 * NOTES: Markdown format includes frontmatter with metadata.
 *        PDF generation uses simple HTML-to-PDF conversion.
 */

import { sanitizeFilename } from './validation'

export interface NoteExportData {
  id: string
  title: string
  content: string
  type: string
  authorEmail: string
  readingTime: number
  categories: string[]
  createdAt: string
  updatedAt: string
}

/**
 * Converts a single note to Markdown format with frontmatter.
 *
 * Format:
 * ---
 * title: Note Title
 * author: user@example.com
 * created: 2024-01-01
 * updated: 2024-01-02
 * type: GENERAL
 * categories: [tag1, tag2]
 * reading_time: 5 minutes
 * ---
 *
 * Note content here...
 *
 * @param note - Note data to export
 * @returns Markdown string with frontmatter
 * @complexity O(n) where n is content length
 */
export function noteToMarkdown(note: NoteExportData): string {
  const frontmatter = [
    '---',
    `title: ${note.title}`,
    `author: ${note.authorEmail}`,
    `created: ${new Date(note.createdAt).toISOString().split('T')[0]}`,
    `updated: ${new Date(note.updatedAt).toISOString().split('T')[0]}`,
    `type: ${note.type}`,
    `categories: [${note.categories.join(', ')}]`,
    `reading_time: ${note.readingTime} ${note.readingTime === 1 ? 'minute' : 'minutes'}`,
    '---',
    '',
  ].join('\n')

  return frontmatter + note.content
}

/**
 * Converts multiple notes to a single Markdown document.
 * Each note is separated by a horizontal rule and heading.
 *
 * @param notes - Array of note data to export
 * @param title - Optional title for the export document
 * @returns Combined Markdown string
 */
export function notesToMarkdown(notes: NoteExportData[], title?: string): string {
  const header = title
    ? `# ${title}\n\nExported ${notes.length} ${notes.length === 1 ? 'note' : 'notes'} on ${new Date().toLocaleDateString()}\n\n---\n\n`
    : ''

  const notesContent = notes
    .map((note, index) => {
      const noteHeader = `## ${note.title}\n\n`
      const metadata = `**Type:** ${note.type} | **Categories:** ${note.categories.join(', ') || 'None'} | **Reading Time:** ${note.readingTime}m\n\n`
      const separator = index < notes.length - 1 ? '\n\n---\n\n' : ''

      return noteHeader + metadata + note.content + separator
    })
    .join('')

  return header + notesContent
}

/**
 * Converts note to simple HTML format suitable for PDF generation.
 * Uses semantic HTML with inline styles for consistent rendering.
 *
 * @param note - Note data to convert
 * @returns HTML string
 */
export function noteToHTML(note: NoteExportData): string {
  const styles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
        color: #333;
      }
      .metadata {
        background: #f5f5f5;
        border-left: 4px solid #3b82f6;
        padding: 1rem;
        margin: 1rem 0 2rem 0;
        font-size: 0.9rem;
      }
      .metadata-row {
        margin: 0.5rem 0;
      }
      .metadata-label {
        font-weight: bold;
        color: #555;
      }
      h1 {
        color: #1f2937;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 0.5rem;
      }
      .content {
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      .footer {
        margin-top: 3rem;
        padding-top: 1rem;
        border-top: 1px solid #e5e7eb;
        font-size: 0.85rem;
        color: #6b7280;
      }
    </style>
  `

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${note.title}</title>
  ${styles}
</head>
<body>
  <h1>${note.title}</h1>

  <div class="metadata">
    <div class="metadata-row">
      <span class="metadata-label">Author:</span> ${note.authorEmail}
    </div>
    <div class="metadata-row">
      <span class="metadata-label">Type:</span> ${note.type}
    </div>
    <div class="metadata-row">
      <span class="metadata-label">Categories:</span> ${note.categories.join(', ') || 'None'}
    </div>
    <div class="metadata-row">
      <span class="metadata-label">Created:</span> ${new Date(note.createdAt).toLocaleString()}
    </div>
    <div class="metadata-row">
      <span class="metadata-label">Last Updated:</span> ${new Date(note.updatedAt).toLocaleString()}
    </div>
    <div class="metadata-row">
      <span class="metadata-label">Reading Time:</span> ${note.readingTime} ${note.readingTime === 1 ? 'minute' : 'minutes'}
    </div>
  </div>

  <div class="content">
${note.content}
  </div>

  <div class="footer">
    Exported from Obscurion on ${new Date().toLocaleString()}
  </div>
</body>
</html>
  `

  return html.trim()
}

/**
 * Generates a safe filename for export based on note title.
 * @param title - Note title
 * @param extension - File extension (without dot)
 * @returns Safe filename
 */
export function generateExportFilename(title: string, extension: string): string {
  const safeTitle = sanitizeFilename(title.slice(0, 100))
  const timestamp = new Date().toISOString().split('T')[0]
  return `${safeTitle}_${timestamp}.${extension}`
}

/**
 * Generates a filename for bulk export.
 * @param count - Number of notes
 * @param extension - File extension
 * @returns Safe filename
 */
export function generateBulkExportFilename(count: number, extension: string): string {
  const timestamp = new Date().toISOString().split('T')[0]
  return `obscurion_notes_${count}_${timestamp}.${extension}`
}

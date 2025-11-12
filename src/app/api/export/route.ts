/**
 * FILE: src/app/api/export/route.ts
 * PURPOSE: Export notes as Markdown or PDF with metadata.
 * INPUTS: HTTP GET requests with query params (format, noteId, categoryId).
 * OUTPUTS: File download responses (text/markdown or application/pdf).
 * NOTES: Supports single note or bulk export by category.
 *        PDF export uses HTML-to-PDF conversion (basic implementation).
 *        For production, consider using Puppeteer or wkhtmltopdf.
 *        Force dynamic to allow headers() and request-specific operations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { validateExportFormat, isValidId } from '@/lib/validation'
import {
  noteToMarkdown,
  notesToMarkdown,
  noteToHTML,
  generateExportFilename,
  generateBulkExportFilename,
  NoteExportData,
} from '@/lib/export'

/**
 * Force dynamic rendering for this route.
 * Required because we use Next.js dynamic APIs (headers, searchParams).
 * Without this, Next.js 14 will error during build.
 */
export const dynamic = 'force-dynamic'

/**
 * GET /api/export
 * Exports notes in specified format.
 *
 * Query params:
 * - format: 'markdown' | 'pdf' (required)
 * - noteId: Specific note ID to export (optional)
 * - categoryId: Export all notes in category (optional)
 *
 * Behavior:
 * - If noteId provided: export single note
 * - If categoryId provided: export all notes in category
 * - If neither: error (must specify what to export)
 * - PDF format returns HTML representation (basic)
 * - Markdown format includes frontmatter with metadata
 *
 * @returns File download with appropriate Content-Type and Content-Disposition headers
 * @complexity O(n) where n is number of notes to export
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check: require valid session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to export notes.' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email
    const { searchParams } = new URL(request.url)

    // Validate format parameter
    const format = validateExportFormat(searchParams.get('format'))
    if (!format) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Valid format is required: markdown or pdf.',
        },
        { status: 400 }
      )
    }

    // Get export scope (single note or category)
    const noteId = searchParams.get('noteId')
    const categoryId = searchParams.get('categoryId')

    if (!noteId && !categoryId) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Either noteId or categoryId must be provided.',
        },
        { status: 400 }
      )
    }

    let notes: any[] = []
    let exportTitle = ''

    // Fetch note(s) to export
    if (noteId) {
      // Single note export
      if (!isValidId(noteId)) {
        return NextResponse.json(
          { error: 'Validation error', message: 'Invalid note ID format.' },
          { status: 400 }
        )
      }

      const note = await db.note.findUnique({
        where: { id: noteId },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
        },
      })

      if (!note) {
        return NextResponse.json(
          { error: 'Not found', message: 'Note not found.' },
          { status: 404 }
        )
      }

      // Check authorization
      if (note.authorEmail !== userEmail) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'You do not have permission to export this note.' },
          { status: 403 }
        )
      }

      notes = [note]
      exportTitle = note.title
    } else if (categoryId) {
      // Bulk export by category
      if (!isValidId(categoryId)) {
        return NextResponse.json(
          { error: 'Validation error', message: 'Invalid category ID format.' },
          { status: 400 }
        )
      }

      // Verify category exists
      const category = await db.category.findUnique({
        where: { id: categoryId },
      })

      if (!category) {
        return NextResponse.json(
          { error: 'Not found', message: 'Category not found.' },
          { status: 404 }
        )
      }

      // Fetch all notes in category for this user
      notes = await db.note.findMany({
        where: {
          authorEmail: userEmail,
          categories: {
            some: {
              categoryId: categoryId,
            },
          },
        },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      if (notes.length === 0) {
        return NextResponse.json(
          { error: 'Not found', message: 'No notes found in this category.' },
          { status: 404 }
        )
      }

      exportTitle = `${category.name} Notes`
    }

    // Transform notes to export format
    const exportData: NoteExportData[] = notes.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      type: note.type,
      authorEmail: note.authorEmail,
      readingTime: note.readingTime,
      categories: note.categories.map((nc: any) => nc.category.name),
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    }))

    // Generate export based on format
    if (format === 'markdown') {
      const markdown =
        exportData.length === 1
          ? noteToMarkdown(exportData[0])
          : notesToMarkdown(exportData, exportTitle)

      const filename =
        exportData.length === 1
          ? generateExportFilename(exportData[0].title, 'md')
          : generateBulkExportFilename(exportData.length, 'md')

      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } else if (format === 'pdf') {
      // PDF export: return HTML for now
      // In production, use Puppeteer or similar to convert HTML to PDF
      // For simplicity, we return HTML with PDF-friendly styling

      if (exportData.length > 1) {
        return NextResponse.json(
          {
            error: 'Not implemented',
            message: 'Bulk PDF export is not yet supported. Please export one note at a time.',
          },
          { status: 501 }
        )
      }

      const html = noteToHTML(exportData[0])
      const filename = generateExportFilename(exportData[0].title, 'html')

      // Return HTML with instructions
      // In production, generate actual PDF here
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    // Fallback (should never reach here)
    return NextResponse.json(
      { error: 'Invalid format', message: 'Export format not supported.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('GET /api/export error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to export notes.' },
      { status: 500 }
    )
  }
}

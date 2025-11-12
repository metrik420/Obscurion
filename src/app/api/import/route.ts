/**
 * FILE: src/app/api/import/route.ts
 * PURPOSE: Import Markdown files and convert them to notes with redaction.
 * INPUTS: HTTP POST with multipart/form-data file uploads.
 * OUTPUTS: JSON response with import results (success count, errors).
 * NOTES: Supports bulk import with 5-file rate limit.
 *        Automatically creates categories from tags in frontmatter.
 *        Applies auto-redaction and generates flashcards.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redactContent, calculateReadingTime } from '@/lib/redaction'
import { generateFlashcardsFromContent, validateFlashcard } from '@/lib/flashcard-generator'
import { parseMarkdownFile, isValidFileSize, isMarkdownFile } from '@/lib/import'

const MAX_FILES_PER_REQUEST = 5

interface ImportResult {
  filename: string
  success: boolean
  noteId?: string
  error?: string
}

/**
 * POST /api/import
 * Imports Markdown files and creates notes.
 *
 * Request body (multipart/form-data):
 * - files: File[] (max 5 files per request)
 *
 * Processing:
 * - Validates file types (.md, .markdown, .mdown, .mkd)
 * - Validates file sizes (max 5MB per file)
 * - Parses frontmatter for metadata (title, type, tags)
 * - Extracts title from H1 heading or uses filename
 * - Applies auto-redaction to content
 * - Generates flashcards from content
 * - Creates categories from tags if they don't exist
 *
 * Rate limiting:
 * - Max 5 files per request
 * - Individual file size limit: 5MB
 *
 * @returns JSON with import results array
 * @complexity O(n * m) where n is number of files, m is average file size
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check: require valid session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to import notes.' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email
    const userId = (session.user as any).id

    // Parse multipart form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    // Validate file count (rate limiting)
    if (files.length === 0) {
      return NextResponse.json(
        { error: 'Validation error', message: 'No files provided.' },
        { status: 400 }
      )
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        {
          error: 'Rate limit',
          message: `Maximum ${MAX_FILES_PER_REQUEST} files per request.`,
        },
        { status: 429 }
      )
    }

    const results: ImportResult[] = []

    // Process each file
    for (const file of files) {
      const filename = file.name

      try {
        // Validate file type
        if (!isMarkdownFile(filename)) {
          results.push({
            filename,
            success: false,
            error: 'Invalid file type. Only Markdown files (.md, .markdown) are supported.',
          })
          continue
        }

        // Validate file size
        if (!isValidFileSize(file.size)) {
          results.push({
            filename,
            success: false,
            error: 'File size exceeds 5MB limit.',
          })
          continue
        }

        // Read file content
        const content = await file.text()

        // Parse Markdown file
        const parsed = parseMarkdownFile(content, filename)

        if (!parsed) {
          results.push({
            filename,
            success: false,
            error: 'Failed to parse Markdown file. Ensure it has valid content.',
          })
          continue
        }

        // Apply auto-redaction
        const redactedContent = redactContent(parsed.content)
        const readingTime = calculateReadingTime(redactedContent)

        // Generate flashcards
        const generatedFlashcards = generateFlashcardsFromContent(parsed.content)

        // Create note with transaction
        // Type assertion for Prisma transaction callback
        const note = await db.$transaction(async (tx: any) => {
          // Create the note
          const newNote = await tx.note.create({
            data: {
              title: parsed.title,
              content: redactedContent,
              type: parsed.type,
              authorEmail: userEmail,
              readingTime,
            },
          })

          // Process tags and create/link categories
          if (parsed.tags.length > 0) {
            const categoryIds: string[] = []

            for (const tagName of parsed.tags) {
              // Try to find existing category (case-insensitive)
              let category = await tx.category.findFirst({
                where: {
                  name: {
                    equals: tagName,
                    mode: 'insensitive',
                  },
                },
              })

              // Create category if doesn't exist
              if (!category) {
                try {
                  category = await tx.category.create({
                    data: {
                      name: tagName,
                    },
                  })
                } catch (error) {
                  // Handle race condition (category created by another request)
                  category = await tx.category.findFirst({
                    where: {
                      name: {
                        equals: tagName,
                        mode: 'insensitive',
                      },
                    },
                  })
                }
              }

              if (category) {
                categoryIds.push(category.id)
              }
            }

            // Create category associations
            if (categoryIds.length > 0) {
              await tx.noteCategory.createMany({
                data: categoryIds.map((categoryId) => ({
                  noteId: newNote.id,
                  categoryId,
                })),
                skipDuplicates: true,
              })
            }
          }

          // Create flashcards if generated
          if (generatedFlashcards.length > 0) {
            const validFlashcards = generatedFlashcards
              .map(validateFlashcard)
              .filter((card) => card !== null) as any[]

            if (validFlashcards.length > 0) {
              await tx.flashcard.createMany({
                data: validFlashcards.map((card) => ({
                  noteId: newNote.id,
                  question: card.question,
                  answer: card.answer,
                  difficulty: card.difficulty,
                })),
              })
            }
          }

          // Create initial version history
          await tx.noteVersion.create({
            data: {
              noteId: newNote.id,
              userId: userId,
              title: parsed.title,
              content: redactedContent,
            },
          })

          return newNote
        })

        results.push({
          filename,
          success: true,
          noteId: note.id,
        })
      } catch (error) {
        console.error(`Error importing file ${filename}:`, error)
        results.push({
          filename,
          success: false,
          error: 'Internal error during import.',
        })
      }
    }

    // Calculate summary
    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
      },
      results,
    })
  } catch (error) {
    console.error('POST /api/import error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to import files.' },
      { status: 500 }
    )
  }
}

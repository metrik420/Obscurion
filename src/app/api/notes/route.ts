/**
 * FILE: src/app/api/notes/route.ts
 * PURPOSE: CRUD operations for notes with automatic redaction and flashcard generation.
 * INPUTS: HTTP requests (GET, POST, PUT, DELETE) with session authentication.
 * OUTPUTS: JSON responses with note data, including categories as string arrays.
 * NOTES: All operations are scoped to authenticated user's email.
 *        POST triggers auto-redaction and flashcard generation.
 *        Includes pagination, filtering, and sorting.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redactContent, calculateReadingTime } from '@/lib/redaction'
import { generateFlashcardsFromContent, validateFlashcard } from '@/lib/flashcard-generator'
import {
  validateNoteTitle,
  validateNoteContent,
  validateNoteType,
  validateCategoryIds,
  validatePagination,
  validateSort,
  isValidId,
} from '@/lib/validation'

/**
 * GET /api/notes
 * Fetches all notes for the authenticated user with pagination, filtering, and sorting.
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * - sortBy: Field to sort by (createdAt|updatedAt|title|readingTime)
 * - sortOrder: Sort direction (asc|desc)
 * - categoryId: Filter by category ID
 * - type: Filter by note type
 *
 * @returns JSON response with notes array, pagination metadata, and category strings
 * @complexity O(n) where n is the number of notes for the user (with DB indices)
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check: require valid session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to access notes.' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email
    const { searchParams } = new URL(request.url)

    // Validate pagination parameters
    const { page, limit, offset } = validatePagination(
      searchParams.get('page'),
      searchParams.get('limit')
    )

    // Validate sort parameters
    const { field: sortBy, order: sortOrder } = validateSort(
      searchParams.get('sortBy'),
      searchParams.get('sortOrder')
    )

    // Optional filters
    const categoryId = searchParams.get('categoryId')
    const noteType = searchParams.get('type')

    // Build where clause for filtering
    const whereClause: any = {
      authorEmail: userEmail,
    }

    if (noteType) {
      whereClause.type = validateNoteType(noteType)
    }

    if (categoryId && isValidId(categoryId)) {
      whereClause.categories = {
        some: {
          categoryId: categoryId,
        },
      }
    }

    // Fetch notes with categories included
    // Use parallel queries for better performance
    const [notes, totalCount] = await Promise.all([
      db.note.findMany({
        where: whereClause,
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          _count: {
            select: {
              flashcards: true,
              versions: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: offset,
        take: limit,
      }),
      db.note.count({ where: whereClause }),
    ])

    // Transform notes to include categories as string array and Phase 2 fields
    // Type assertion because Prisma includes are not inferred properly
    const notesWithCategories = notes.map((note: any) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      type: note.type,
      authorEmail: note.authorEmail,
      readingTime: note.readingTime,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      categories: note.categories.map((nc: any) => nc.category.name),
      categoryIds: note.categories.map((nc: any) => nc.categoryId),
      flashcardCount: note._count.flashcards,
      versionCount: note._count.versions,
      tags: note.tags || [],
      status: note.status || 'ACTIVE',
      isPinned: note.isPinned || false,
    }))

    return NextResponse.json({
      notes: notesWithCategories,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + notes.length < totalCount,
      },
    })
  } catch (error) {
    console.error('GET /api/notes error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch notes.' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notes
 * Creates a new note with automatic redaction and flashcard generation.
 *
 * Request body:
 * - title: string (required, 1-200 chars)
 * - content: string (required, 1-1MB)
 * - type: string (optional, defaults to 'GENERAL')
 * - categoryIds: string[] (optional, max 20 categories)
 *
 * Side effects:
 * - Applies auto-redaction to content (emails, IPs, credentials, etc.)
 * - Calculates reading time (200 WPM baseline)
 * - Generates flashcards automatically from content patterns
 * - Creates category associations
 * - Creates initial version history entry
 *
 * @returns JSON response with created note including categories
 * @complexity O(n + m) where n is content length, m is number of flashcards generated
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to create notes.' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email
    const userId = (session.user as any).id

    // Parse and validate request body
    const body = await request.json()
    const { title, content, type, categoryIds, tags, status, isPinned } = body

    // Validate required fields
    const validatedTitle = validateNoteTitle(title)
    if (!validatedTitle) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Title is required and must be 1-200 characters.' },
        { status: 400 }
      )
    }

    const validatedContent = validateNoteContent(content)
    if (!validatedContent) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Content is required and must be under 1MB.' },
        { status: 400 }
      )
    }

    // Apply auto-redaction to content
    // This is irreversible and happens before database write
    const redactedContent = redactContent(validatedContent)

    // Calculate reading time (200 WPM)
    const readingTime = calculateReadingTime(redactedContent)

    // Validate optional fields
    const validatedType = validateNoteType(type)
    const validatedCategoryIds = validateCategoryIds(categoryIds)

    // Generate flashcards from content
    // Uses pattern matching to extract Q&A pairs
    // IMPORTANT: Generate from redacted content to match what's stored in DB
    console.log('[Flashcard Generation] Starting flashcard generation for new note')
    console.log('[Flashcard Generation] Content length:', redactedContent.length, 'chars')

    const generatedFlashcards = generateFlashcardsFromContent(redactedContent)
    console.log('[Flashcard Generation] Generated', generatedFlashcards.length, 'raw flashcards')

    if (generatedFlashcards.length > 0) {
      console.log('[Flashcard Generation] Sample flashcard:', {
        question: generatedFlashcards[0].question.substring(0, 50),
        answer: generatedFlashcards[0].answer.substring(0, 50),
        difficulty: generatedFlashcards[0].difficulty,
      })
    }

    // Create note in database with transaction to ensure atomicity
    // Type assertion for Prisma transaction callback
    const note = await db.$transaction(async (tx: any) => {
      // Validate Phase 2 fields
      const validatedTags = Array.isArray(tags)
        ? tags
            .filter((tag) => typeof tag === 'string' && tag.trim().length > 0)
            .map((tag) => tag.trim())
            .slice(0, 50) // Limit to 50 tags max
        : []

      const validatedStatus = ['ACTIVE', 'ARCHIVED', 'DRAFT'].includes(status) ? status : 'ACTIVE'
      const validatedIsPinned = typeof isPinned === 'boolean' ? isPinned : false

      // Create the note
      const newNote = await tx.note.create({
        data: {
          title: validatedTitle,
          content: redactedContent,
          type: validatedType,
          authorEmail: userEmail,
          readingTime,
          tags: validatedTags,
          status: validatedStatus,
          isPinned: validatedIsPinned,
        },
      })

      console.log('[Note Creation] Created note with ID:', newNote.id)

      // Create category associations if provided
      if (validatedCategoryIds.length > 0) {
        // Verify categories exist
        const existingCategories = await tx.category.findMany({
          where: {
            id: {
              in: validatedCategoryIds,
            },
          },
        })

        // Create associations for existing categories only
        await tx.noteCategory.createMany({
          data: existingCategories.map((cat: any) => ({
            noteId: newNote.id,
            categoryId: cat.id,
          })),
        })

        console.log('[Note Creation] Associated', existingCategories.length, 'categories')
      }

      // Create flashcards if any were generated
      if (generatedFlashcards.length > 0) {
        const validFlashcards = generatedFlashcards
          .map(validateFlashcard)
          .filter((card) => card !== null) as any[]

        console.log('[Flashcard Creation] Validated', validFlashcards.length, 'flashcards')

        if (validFlashcards.length > 0) {
          const flashcardData = validFlashcards.map((card) => ({
            noteId: newNote.id,
            question: card.question,
            answer: card.answer,
            difficulty: card.difficulty,
          }))

          await tx.flashcard.createMany({
            data: flashcardData,
          })

          console.log('[Flashcard Creation] Successfully created', flashcardData.length, 'flashcards in database')
        } else {
          console.log('[Flashcard Creation] No valid flashcards after validation')
        }
      } else {
        console.log('[Flashcard Creation] No flashcards generated from content')
      }

      // Create initial version history entry
      await tx.noteVersion.create({
        data: {
          noteId: newNote.id,
          userId: userId,
          title: validatedTitle,
          content: redactedContent,
        },
      })

      // Return note with categories
      return await tx.note.findUnique({
        where: { id: newNote.id },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          _count: {
            select: {
              flashcards: true,
            },
          },
        },
      })
    })

    if (!note) {
      throw new Error('Failed to create note')
    }

    // Format response
    const response = {
      id: note.id,
      title: note.title,
      content: note.content,
      type: note.type,
      authorEmail: note.authorEmail,
      readingTime: note.readingTime,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      categories: note.categories.map((nc: any) => nc.category.name),
      categoryIds: note.categories.map((nc: any) => nc.categoryId),
      flashcardCount: note._count.flashcards,
      tags: note.tags || [],
      status: note.status || 'ACTIVE',
      isPinned: note.isPinned || false,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('POST /api/notes error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create note.' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/notes
 * Updates an existing note by ID with authorization check.
 *
 * Request body:
 * - id: string (required, note ID)
 * - title: string (optional)
 * - content: string (optional)
 * - type: string (optional)
 * - categoryIds: string[] (optional)
 *
 * Side effects:
 * - Creates a new version history entry on successful update
 * - Updates category associations (replaces existing)
 * - Does NOT re-run flashcard generation (manual operation)
 *
 * @returns JSON response with updated note
 * @complexity O(n) where n is number of categories
 */
export async function PUT(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to update notes.' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email
    const userId = (session.user as any).id

    // Parse request body
    const body = await request.json()
    const { id, title, content, type, categoryIds, tags, status, isPinned } = body

    // Validate note ID
    if (!isValidId(id)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid note ID format.' },
        { status: 400 }
      )
    }

    // Verify note exists and user has permission
    const existingNote = await db.note.findUnique({
      where: { id },
    })

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Not found', message: 'Note not found.' },
        { status: 404 }
      )
    }

    if (existingNote.authorEmail !== userEmail) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to update this note.' },
        { status: 403 }
      )
    }

    // Build update data object
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (title !== undefined) {
      const validatedTitle = validateNoteTitle(title)
      if (!validatedTitle) {
        return NextResponse.json(
          { error: 'Validation error', message: 'Title must be 1-200 characters.' },
          { status: 400 }
        )
      }
      updateData.title = validatedTitle
    }

    if (content !== undefined) {
      const validatedContent = validateNoteContent(content)
      if (!validatedContent) {
        return NextResponse.json(
          { error: 'Validation error', message: 'Content must be under 1MB.' },
          { status: 400 }
        )
      }
      // Re-apply redaction for updated content
      updateData.content = redactContent(validatedContent)
      updateData.readingTime = calculateReadingTime(updateData.content)
    }

    if (type !== undefined) {
      updateData.type = validateNoteType(type)
    }

    // Phase 2: Handle tags
    if (tags !== undefined && Array.isArray(tags)) {
      // Validate tags array
      const validatedTags = tags
        .filter((tag) => typeof tag === 'string' && tag.trim().length > 0)
        .map((tag) => tag.trim())
        .slice(0, 50) // Limit to 50 tags max
      updateData.tags = validatedTags
    }

    // Phase 2: Handle status
    if (status !== undefined) {
      const validStatus = ['ACTIVE', 'ARCHIVED', 'DRAFT'].includes(status) ? status : 'ACTIVE'
      updateData.status = validStatus
    }

    // Phase 2: Handle isPinned
    if (isPinned !== undefined && typeof isPinned === 'boolean') {
      updateData.isPinned = isPinned
    }

    // Update note with transaction
    // Type assertion for Prisma transaction callback
    const updatedNote = await db.$transaction(async (tx: any) => {
      // Update the note
      const note = await tx.note.update({
        where: { id },
        data: updateData,
      })

      // Update category associations if provided
      if (categoryIds !== undefined) {
        const validatedCategoryIds = validateCategoryIds(categoryIds)

        // Remove existing associations
        await tx.noteCategory.deleteMany({
          where: { noteId: id },
        })

        // Create new associations
        if (validatedCategoryIds.length > 0) {
          const existingCategories = await tx.category.findMany({
            where: {
              id: {
                in: validatedCategoryIds,
              },
            },
          })

          await tx.noteCategory.createMany({
            data: existingCategories.map((cat: any) => ({
              noteId: id,
              categoryId: cat.id,
            })),
          })
        }
      }

      // Create version history entry
      await tx.noteVersion.create({
        data: {
          noteId: id,
          userId: userId,
          title: updateData.title || existingNote.title,
          content: updateData.content || existingNote.content,
        },
      })

      // Return updated note with categories
      return await tx.note.findUnique({
        where: { id },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          _count: {
            select: {
              flashcards: true,
              versions: true,
            },
          },
        },
      })
    })

    if (!updatedNote) {
      throw new Error('Failed to update note')
    }

    // Format response
    const response = {
      id: updatedNote.id,
      title: updatedNote.title,
      content: updatedNote.content,
      type: updatedNote.type,
      authorEmail: updatedNote.authorEmail,
      readingTime: updatedNote.readingTime,
      createdAt: updatedNote.createdAt.toISOString(),
      updatedAt: updatedNote.updatedAt.toISOString(),
      categories: updatedNote.categories.map((nc: any) => nc.category.name),
      categoryIds: updatedNote.categories.map((nc: any) => nc.categoryId),
      flashcardCount: updatedNote._count.flashcards,
      versionCount: updatedNote._count.versions,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('PUT /api/notes error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update note.' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notes
 * Deletes a note by ID with authorization check.
 *
 * Query params:
 * - id: string (required, note ID)
 *
 * Side effects:
 * - Cascades delete to: categories associations, flashcards, versions
 * - Uses Prisma cascade delete (configured in schema)
 *
 * @returns JSON response with success message
 * @complexity O(1) - single delete with cascade
 */
export async function DELETE(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to delete notes.' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email
    const { searchParams } = new URL(request.url)
    const noteId = searchParams.get('id')

    // Validate note ID
    if (!noteId || !isValidId(noteId)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Valid note ID is required.' },
        { status: 400 }
      )
    }

    // Verify note exists and user has permission
    const existingNote = await db.note.findUnique({
      where: { id: noteId },
    })

    if (!existingNote) {
      return NextResponse.json(
        { error: 'Not found', message: 'Note not found.' },
        { status: 404 }
      )
    }

    if (existingNote.authorEmail !== userEmail) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to delete this note.' },
        { status: 403 }
      )
    }

    // Delete note (cascade deletes associated records)
    await db.note.delete({
      where: { id: noteId },
    })

    return NextResponse.json({
      success: true,
      message: 'Note deleted successfully.',
    })
  } catch (error) {
    console.error('DELETE /api/notes error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to delete note.' },
      { status: 500 }
    )
  }
}

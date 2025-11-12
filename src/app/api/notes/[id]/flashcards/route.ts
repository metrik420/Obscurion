/**
 * FILE: src/app/api/notes/[id]/flashcards/route.ts
 * PURPOSE: CRUD operations for flashcards associated with a note.
 * INPUTS: Session (NextAuth), noteId (route param), request body (POST).
 * OUTPUTS: JSON responses with flashcard data or error messages.
 * NOTES: Validates note ownership before any operation.
 *        POST accepts question, answer, difficulty.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

/**
 * Validation schema for flashcard creation.
 * Enforces business rules and input constraints.
 */
const flashcardCreateSchema = z.object({
  question: z
    .string()
    .min(1, 'Question is required')
    .max(255, 'Question must be 255 characters or less')
    .trim(),
  answer: z
    .string()
    .min(1, 'Answer is required')
    .max(5000, 'Answer must be 5000 characters or less')
    .trim(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
})

/**
 * GET /api/notes/[id]/flashcards
 * Fetches all flashcards for a given note.
 *
 * @complexity O(n) where n = number of flashcards for the note
 * @security Validates session and note ownership
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      console.log('[Flashcard Fetch] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const noteId = params.id
    console.log('[Flashcard Fetch] Fetching flashcards for note:', noteId)

    // Verify note exists and user owns it
    const note = await db.note.findUnique({
      where: { id: noteId },
    })

    if (!note) {
      console.log('[Flashcard Fetch] Note not found:', noteId)
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    if (note.authorEmail !== session.user.email) {
      console.log('[Flashcard Fetch] Forbidden: User does not own note')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch flashcards ordered by creation date (newest first)
    const flashcards = await db.flashcard.findMany({
      where: { noteId },
      select: {
        id: true,
        question: true,
        answer: true,
        difficulty: true,
        createdAt: true,
        noteId: true,
        note: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log('[Flashcard Fetch] Found', flashcards.length, 'flashcards for note:', noteId)

    if (flashcards.length > 0) {
      console.log('[Flashcard Fetch] Sample flashcard:', {
        question: flashcards[0].question.substring(0, 50),
        difficulty: flashcards[0].difficulty,
      })
    }

    return NextResponse.json({ flashcards })
  } catch (error) {
    console.error('[Flashcard Fetch] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notes/[id]/flashcards
 * Creates a new flashcard for a note.
 *
 * @complexity O(1) DB write + O(n) validation where n = input length
 * @security Validates session, note ownership, and input schema
 * @returns 201 with created flashcard object
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const noteId = params.id

    // Verify note exists and user owns it
    const note = await db.note.findUnique({
      where: { id: noteId },
    })

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    if (note.authorEmail !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = flashcardCreateSchema.safeParse(body)

    if (!validationResult.success) {
      // Extract first validation error for user-friendly message
      const firstError = validationResult.error.issues[0]
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      )
    }

    const { question, answer, difficulty } = validationResult.data

    // Create flashcard in database
    const flashcard = await db.flashcard.create({
      data: {
        question,
        answer,
        difficulty,
        noteId,
      },
      select: {
        id: true,
        question: true,
        answer: true,
        difficulty: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      { flashcard },
      { status: 201 }
    )
  } catch (error) {
    console.error('Flashcard creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create flashcard. Please try again.' },
      { status: 500 }
    )
  }
}

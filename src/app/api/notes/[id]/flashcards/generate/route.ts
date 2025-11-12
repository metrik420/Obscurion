/**
 * FILE: src/app/api/notes/[id]/flashcards/generate/route.ts
 * PURPOSE: Auto-generate flashcards from note content using smart extraction.
 * INPUTS: Note ID (route param), note title and content (from database).
 * OUTPUTS: Array of auto-generated flashcards.
 * NOTES: Uses intelligent content parsing to create meaningful Q&A pairs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateFlashcardsFromContent } from '@/lib/flashcardGenerator'

/**
 * POST /api/notes/[id]/flashcards/generate
 * Auto-generates flashcards from note content.
 *
 * @complexity O(n) where n = length of note content
 * @security Validates session and note ownership
 * @returns Array of generated flashcards ready to be saved
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
    console.log('[Flashcard Generate] Generating flashcards for note:', noteId)

    // Verify note exists and user owns it
    const note = await db.note.findUnique({
      where: { id: noteId },
      select: { id: true, title: true, content: true, authorEmail: true },
    })

    if (!note) {
      console.log('[Flashcard Generate] Note not found:', noteId)
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    if (note.authorEmail !== session.user.email) {
      console.log('[Flashcard Generate] Forbidden: User does not own note')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Generate flashcards from content
    const generatedFlashcards = generateFlashcardsFromContent(note.title, note.content)

    console.log(
      '[Flashcard Generate] Generated',
      generatedFlashcards.length,
      'flashcards from note content'
    )

    if (generatedFlashcards.length > 0) {
      console.log('[Flashcard Generate] Sample generated flashcard:', {
        question: generatedFlashcards[0].question,
        difficulty: generatedFlashcards[0].difficulty,
      })
    }

    // Return generated flashcards (user can review before saving)
    return NextResponse.json({
      flashcards: generatedFlashcards,
      message: `Generated ${generatedFlashcards.length} flashcards from your note content`,
    })
  } catch (error) {
    console.error('[Flashcard Generate] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate flashcards' },
      { status: 500 }
    )
  }
}


/**
 * FILE: src/app/api/notes/[id]/flashcards/[cardId]/route.ts
 * PURPOSE: DELETE operation for individual flashcards.
 * INPUTS: Session (NextAuth), noteId and cardId (route params).
 * OUTPUTS: JSON response with success/error message.
 * NOTES: Validates note ownership via flashcard.note relationship.
 *        Returns 404 if flashcard doesn't exist or was already deleted.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * DELETE /api/notes/[id]/flashcards/[cardId]
 * Deletes a specific flashcard.
 *
 * @complexity O(1) DB delete with indexed lookup
 * @security Validates session and note ownership via flashcard relation
 * @returns 200 with success message or error response
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; cardId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: noteId, cardId } = params

    // Fetch flashcard with note relation to verify ownership
    // Using a single query prevents TOCTOU (time-of-check-time-of-use) race
    const flashcard = await db.flashcard.findUnique({
      where: { id: cardId },
      include: {
        note: {
          select: {
            id: true,
            authorEmail: true,
          },
        },
      },
    })

    if (!flashcard) {
      return NextResponse.json(
        { error: 'Flashcard not found' },
        { status: 404 }
      )
    }

    // Verify flashcard belongs to the specified note
    if (flashcard.noteId !== noteId) {
      return NextResponse.json(
        { error: 'Flashcard does not belong to this note' },
        { status: 400 }
      )
    }

    // Verify user owns the note
    if (flashcard.note.authorEmail !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete the flashcard (cascading handled by Prisma schema)
    await db.flashcard.delete({
      where: { id: cardId },
    })

    return NextResponse.json(
      { message: 'Flashcard deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Flashcard deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete flashcard. Please try again.' },
      { status: 500 }
    )
  }
}

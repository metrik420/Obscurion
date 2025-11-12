/**
 * FILE: src/app/api/flashcards/route.ts
 * PURPOSE: Get all flashcards for the authenticated user across all their notes.
 * INPUTS: Session (NextAuth).
 * OUTPUTS: JSON array of all user flashcards with note metadata.
 * NOTES: Returns paginated results, ordered by creation date (newest first).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/flashcards
 * Fetches all flashcards for the authenticated user.
 *
 * @complexity O(n) where n = total number of user flashcards
 * @security Validates session - only returns flashcards the user owns
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      console.log('[All Flashcards Fetch] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get pagination params from query
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    console.log('[All Flashcards Fetch] User email:', session.user.email)

    // Fetch all flashcards for notes owned by this user
    const flashcards = await db.flashcard.findMany({
      where: {
        note: {
          authorEmail: session.user.email,
        },
      },
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
      skip,
      take: limit,
    })

    // Get total count for pagination
    const totalCount = await db.flashcard.count({
      where: {
        note: {
          authorEmail: session.user.email,
        },
      },
    })

    console.log('[All Flashcards Fetch] Found', flashcards.length, 'flashcards for user')

    return NextResponse.json({
      flashcards,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error('[All Flashcards Fetch] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

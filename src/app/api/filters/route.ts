import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/filters
 * Returns available filter options and facets for the user's notes.
 * Used to populate filter UI with available tags, statuses, and categories.
 *
 * Returns:
 * - tags: Array of all tags used by user's notes with counts
 * - statuses: Array of available note statuses (ACTIVE, ARCHIVED, DRAFT)
 * - categories: Array of categories used in user's notes
 * - hasPinnedNotes: Whether user has any pinned notes
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in.' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email

    // Fetch all notes for the user to extract filter options
    const userNotes = await db.note.findMany({
      where: { authorEmail: userEmail },
      select: {
        id: true,
        tags: true,
        status: true,
        isPinned: true,
        categories: {
          select: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    // Extract unique tags with counts
    const tagCounts = new Map<string, number>()
    userNotes.forEach((note) => {
      note.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })

    const tags = Array.from(tagCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count) // Sort by count descending

    // Extract unique categories
    const categoryMap = new Map<string, { id: string; name: string; count: number }>()
    userNotes.forEach((note) => {
      note.categories.forEach(({ category }) => {
        const existing = categoryMap.get(category.id)
        categoryMap.set(category.id, {
          id: category.id,
          name: category.name,
          count: (existing?.count || 0) + 1,
        })
      })
    })

    const categories = Array.from(categoryMap.values())
      .sort((a, b) => b.count - a.count)

    // Get status counts
    const statusCounts = new Map<string, number>()
    userNotes.forEach((note) => {
      statusCounts.set(
        note.status,
        (statusCounts.get(note.status) || 0) + 1
      )
    })

    const statuses = ['ACTIVE', 'ARCHIVED', 'DRAFT']
      .map((status) => ({
        value: status,
        label: status.charAt(0) + status.slice(1).toLowerCase(),
        count: statusCounts.get(status) || 0,
      }))
      .filter((s) => s.count > 0)

    // Check if user has any pinned notes
    const hasPinnedNotes = userNotes.some((note) => note.isPinned)
    const pinnedCount = userNotes.filter((note) => note.isPinned).length

    return NextResponse.json({
      tags,
      statuses,
      categories,
      pinnedNotes: {
        available: hasPinnedNotes,
        count: pinnedCount,
      },
      totalNotes: userNotes.length,
    })
  } catch (error) {
    console.error('GET /api/filters error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

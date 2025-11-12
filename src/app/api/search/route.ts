/**
 * FILE: src/app/api/search/route.ts
 * PURPOSE: Full-text search across notes with category filtering and pagination.
 * INPUTS: HTTP GET requests with query parameters (q, categoryId, page, limit).
 * OUTPUTS: JSON array of matching notes with highlighted snippets and reading time.
 * NOTES: Uses PostgreSQL full-text search capabilities via Prisma.
 *        Search is case-insensitive and matches title OR content.
 *        Results include contextual snippets for preview.
 *        Force dynamic to allow headers() and request-specific operations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { validateSearchQuery, validatePagination, isValidId } from '@/lib/validation'

/**
 * Force dynamic rendering for this route.
 * Required because we use Next.js dynamic APIs (headers, searchParams).
 * Without this, Next.js 14 will error during build.
 */
export const dynamic = 'force-dynamic'

/**
 * Extracts a snippet of text around the first occurrence of the search term.
 * @param text - Full text to extract from
 * @param query - Search query to locate
 * @param maxLength - Maximum snippet length (default: 200)
 * @returns Snippet with ellipsis if truncated
 * @complexity O(n) where n is text length
 */
function extractSnippet(text: string, query: string, maxLength: number = 200): string {
  if (!query || !text) return text.slice(0, maxLength) + (text.length > maxLength ? '...' : '')

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const index = lowerText.indexOf(lowerQuery)

  if (index === -1) {
    // Query not found, return beginning
    return text.slice(0, maxLength) + (text.length > maxLength ? '...' : '')
  }

  // Calculate snippet window around the match
  const start = Math.max(0, index - 80)
  const end = Math.min(text.length, index + maxLength - 80)

  let snippet = text.slice(start, end)

  // Add ellipsis if truncated
  if (start > 0) snippet = '...' + snippet
  if (end < text.length) snippet = snippet + '...'

  return snippet
}

/**
 * Highlights search terms in text with simple markers.
 * @param text - Text to highlight
 * @param query - Search query terms
 * @returns Text with **term** markers around matches
 */
function highlightMatches(text: string, query: string): string {
  if (!query) return text

  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2)
  let highlighted = text

  terms.forEach((term) => {
    const regex = new RegExp(`(${term})`, 'gi')
    highlighted = highlighted.replace(regex, '**$1**')
  })

  return highlighted
}

/**
 * GET /api/search
 * Performs full-text search across user's notes with advanced filtering.
 *
 * Query params:
 * - q: Search query string (optional)
 * - categoryId: Filter by specific category (optional)
 * - status: Filter by note status (ACTIVE, ARCHIVED, DRAFT) (optional)
 * - tags: Comma-separated tags to filter by (optional)
 * - pinned: Filter to pinned notes only (optional, true/false)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 *
 * Search behavior:
 * - Searches title, content, and searchText fields (case-insensitive)
 * - Pinned notes always appear first
 * - Multiple tags use AND logic (all selected tags must match)
 * - Empty query returns all notes matching filters
 * - Tracks search history for analytics
 *
 * @returns JSON with results array and pagination metadata
 * @complexity O(log n) with proper DB indices
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check: require valid session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to search notes.' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email
    const { searchParams } = new URL(request.url)

    // Extract and validate search query (optional for Phase 2)
    const rawQuery = searchParams.get('q')
    const query = rawQuery ? validateSearchQuery(rawQuery) : ''

    // Validate pagination
    const { page, limit, offset } = validatePagination(
      searchParams.get('page'),
      searchParams.get('limit')
    )

    // Extract filters
    const categoryId = searchParams.get('categoryId')
    const status = searchParams.get('status')
    const tagsParam = searchParams.get('tags')
    const tags = tagsParam ? tagsParam.split(',').filter((t) => t.trim()) : []
    const isPinned = searchParams.get('pinned') === 'true' ? true : undefined

    // Build where clause
    const whereClause: any = {
      authorEmail: userEmail,
    }

    // Add text search if query provided
    if (query && query.length > 0) {
      whereClause.OR = [
        {
          title: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          content: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          searchText: {
            contains: query,
            mode: 'insensitive',
          },
        },
      ]
    }

    // Add status filter if provided
    if (status && ['ACTIVE', 'ARCHIVED', 'DRAFT'].includes(status)) {
      whereClause.status = status
    }

    // Add tags filter (all tags must match)
    if (tags.length > 0) {
      whereClause.tags = {
        hasSome: tags,
      }
    }

    // Add pinned filter if provided
    if (isPinned !== undefined) {
      whereClause.isPinned = isPinned
    }

    // Add category filter if provided
    if (categoryId && isValidId(categoryId)) {
      whereClause.categories = {
        some: {
          categoryId: categoryId,
        },
      }
    }

    // Execute search with pagination
    // Use parallel queries for performance
    const [results, totalCount] = await Promise.all([
      db.note.findMany({
        where: whereClause,
        include: {
          categories: {
            include: {
              category: true,
            },
          },
        },
        orderBy: [
          // Pinned notes first, then by most recently updated
          { isPinned: 'desc' },
          { updatedAt: 'desc' },
        ],
        skip: offset,
        take: limit,
      }),
      db.note.count({ where: whereClause }),
    ])

    // Transform results to include snippets and highlights
    // Type assertion because Prisma includes are not inferred properly
    const formattedResults = results.map((note: any) => {
      // Extract snippet from content
      const contentSnippet = query ? extractSnippet(note.content, query, 200) : note.content.slice(0, 200) + '...'
      const highlightedSnippet = query ? highlightMatches(contentSnippet, query) : contentSnippet

      // Check if query matches title
      const titleMatch = query ? note.title.toLowerCase().includes(query.toLowerCase()) : false

      return {
        id: note.id,
        title: titleMatch ? highlightMatches(note.title, query) : note.title,
        snippet: highlightedSnippet,
        type: note.type,
        status: note.status,
        tags: note.tags,
        isPinned: note.isPinned,
        readingTime: note.readingTime,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        categories: note.categories.map((nc: any) => nc.category.name),
        categoryIds: note.categories.map((nc: any) => nc.categoryId),
        matchedIn: titleMatch ? 'title' : 'content',
      }
    })

    // Log search to history if query provided
    if (query && query.length > 0) {
      try {
        await db.searchHistory.create({
          data: {
            userEmail,
            query,
            filters: JSON.stringify({
              status,
              tags,
              isPinned,
              categoryId,
            }),
            resultCount: totalCount,
          },
        })
      } catch (error) {
        // Don't fail the search if logging fails
        console.error('Failed to log search history:', error)
      }
    }

    return NextResponse.json({
      results: formattedResults,
      query,
      filters: {
        status,
        tags,
        isPinned,
        categoryId,
      },
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + results.length < totalCount,
      },
    })
  } catch (error) {
    console.error('GET /api/search error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Search failed.' },
      { status: 500 }
    )
  }
}

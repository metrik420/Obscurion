/**
 * FILE: src/app/api/notes/[id]/versions/[versionId]/route.ts
 * PURPOSE: Fetch full content of a specific version for comparison and viewing.
 * INPUTS: HTTP GET with note ID and version ID in URL params.
 * OUTPUTS: JSON with complete version data including full content.
 * NOTES: This endpoint returns the FULL content, unlike the list endpoint which
 *        returns only previews (200 chars) for performance.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { isValidId } from '@/lib/validation'

/**
 * GET /api/notes/[id]/versions/[versionId]
 * Fetches complete content of a specific version.
 *
 * Use cases:
 * - Viewing full version for comparison
 * - Generating diffs between versions
 * - Displaying version details in modal
 *
 * Security:
 * - Validates session
 * - Verifies note ownership
 * - Ensures version belongs to the specified note
 *
 * @returns JSON with full version data
 * @complexity O(1) - single DB query
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    // Auth check: require valid session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to view versions.' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email
    const noteId = params.id
    const versionId = params.versionId

    // Validate IDs
    if (!isValidId(noteId) || !isValidId(versionId)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid note or version ID format.' },
        { status: 400 }
      )
    }

    // Verify note exists and user has permission
    const note = await db.note.findUnique({
      where: { id: noteId },
    })

    if (!note) {
      return NextResponse.json(
        { error: 'Not found', message: 'Note not found.' },
        { status: 404 }
      )
    }

    if (note.authorEmail !== userEmail) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to view this note.' },
        { status: 403 }
      )
    }

    // Fetch the specific version with full content
    const version = await db.noteVersion.findUnique({
      where: { id: versionId },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    })

    if (!version) {
      return NextResponse.json(
        { error: 'Not found', message: 'Version not found.' },
        { status: 404 }
      )
    }

    // Verify version belongs to this note
    if (version.noteId !== noteId) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'This version does not belong to the specified note.',
        },
        { status: 403 }
      )
    }

    // Return full version data
    return NextResponse.json({
      id: version.id,
      noteId: version.noteId,
      title: version.title,
      content: version.content, // Full content, not preview
      contentLength: version.content.length,
      createdAt: version.createdAt.toISOString(),
      user: {
        email: version.user.email,
        name: version.user.name,
      },
    })
  } catch (error) {
    console.error('GET /api/notes/[id]/versions/[versionId] error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch version.' },
      { status: 500 }
    )
  }
}

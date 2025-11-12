/**
 * FILE: src/app/api/notes/[id]/versions/route.ts
 * PURPOSE: Manage note version history with view and restore capabilities.
 * INPUTS: HTTP GET (list versions), POST (create version), PUT (restore version).
 * OUTPUTS: JSON responses with version data and timestamps.
 * NOTES: Versions are automatically created on note updates via main notes API.
 *        This API provides manual version creation and restore functionality.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { isValidId } from '@/lib/validation'

/**
 * GET /api/notes/[id]/versions
 * Fetches all versions of a note with timestamps.
 *
 * Returns versions ordered by creation date (newest first) with:
 * - id: Version ID
 * - title: Note title at this version
 * - content: Note content at this version (first 200 chars preview)
 * - createdAt: Version timestamp
 * - userId: User who created this version
 *
 * @returns JSON with versions array
 * @complexity O(n) where n is number of versions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check: require valid session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to view version history.' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email
    const noteId = params.id

    // Validate note ID
    if (!isValidId(noteId)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid note ID format.' },
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

    // Fetch all versions
    const versions = await db.noteVersion.findMany({
      where: {
        noteId: noteId,
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Format versions with content preview
    // Type assertion because Prisma includes are not inferred properly
    const formattedVersions = versions.map((version: any) => ({
      id: version.id,
      title: version.title,
      contentPreview: version.content.slice(0, 200) + (version.content.length > 200 ? '...' : ''),
      contentLength: version.content.length,
      createdAt: version.createdAt.toISOString(),
      user: {
        email: version.user.email,
        name: version.user.name,
      },
    }))

    return NextResponse.json({
      noteId,
      versions: formattedVersions,
      total: formattedVersions.length,
    })
  } catch (error) {
    console.error('GET /api/notes/[id]/versions error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch version history.' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notes/[id]/versions
 * Manually creates a version snapshot of the current note state.
 *
 * Use cases:
 * - Creating a checkpoint before major edits
 * - Backup before risky operations
 *
 * Side effects:
 * - Creates a new version entry with current note state
 * - Does NOT modify the note itself
 *
 * @returns JSON with created version
 * @complexity O(1) - single insert
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check: require valid session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to create versions.' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email
    const userId = (session.user as any).id
    const noteId = params.id

    // Validate note ID
    if (!isValidId(noteId)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid note ID format.' },
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
        { error: 'Forbidden', message: 'You do not have permission to version this note.' },
        { status: 403 }
      )
    }

    // Create version snapshot
    const version = await db.noteVersion.create({
      data: {
        noteId: noteId,
        userId: userId,
        title: note.title,
        content: note.content,
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        id: version.id,
        noteId: version.noteId,
        title: version.title,
        contentPreview: version.content.slice(0, 200) + (version.content.length > 200 ? '...' : ''),
        createdAt: version.createdAt.toISOString(),
        user: {
          email: version.user.email,
          name: version.user.name,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/notes/[id]/versions error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create version.' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/notes/[id]/versions
 * Restores a note to a previous version.
 *
 * Request body:
 * - versionId: string (required, version ID to restore)
 *
 * Side effects:
 * - Updates note title and content to match the version
 * - Creates a NEW version entry for the restore operation
 * - Preserves the original version (non-destructive)
 *
 * @returns JSON with updated note
 * @complexity O(1) - update + insert
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check: require valid session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to restore versions.' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email
    const userId = (session.user as any).id
    const noteId = params.id

    // Parse request body
    const body = await request.json()
    const { versionId } = body

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
        { error: 'Forbidden', message: 'You do not have permission to restore this note.' },
        { status: 403 }
      )
    }

    // Verify version exists and belongs to this note
    const version = await db.noteVersion.findUnique({
      where: { id: versionId },
    })

    if (!version || version.noteId !== noteId) {
      return NextResponse.json(
        { error: 'Not found', message: 'Version not found or does not belong to this note.' },
        { status: 404 }
      )
    }

    // Restore note to version state with transaction
    // Type assertion for Prisma transaction callback
    const updatedNote = await db.$transaction(async (tx: any) => {
      // Update note with version content
      const restored = await tx.note.update({
        where: { id: noteId },
        data: {
          title: version.title,
          content: version.content,
          updatedAt: new Date(),
        },
      })

      // Create a new version entry for the restore operation
      await tx.noteVersion.create({
        data: {
          noteId: noteId,
          userId: userId,
          title: version.title,
          content: version.content,
        },
      })

      return restored
    })

    return NextResponse.json({
      id: updatedNote.id,
      title: updatedNote.title,
      content: updatedNote.content,
      type: updatedNote.type,
      authorEmail: updatedNote.authorEmail,
      readingTime: updatedNote.readingTime,
      createdAt: updatedNote.createdAt.toISOString(),
      updatedAt: updatedNote.updatedAt.toISOString(),
      restoredFromVersionId: versionId,
      message: 'Note restored to previous version successfully.',
    })
  } catch (error) {
    console.error('PUT /api/notes/[id]/versions error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to restore version.' },
      { status: 500 }
    )
  }
}

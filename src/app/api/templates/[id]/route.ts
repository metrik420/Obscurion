/**
 * FILE: src/app/api/templates/[id]/route.ts
 * PURPOSE: Fetch individual template and create notes from templates.
 * INPUTS: HTTP GET (fetch template by ID).
 * OUTPUTS: JSON response with full template data including content.
 * NOTES: Used when user selects a template to create a new note.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { isValidId } from '@/lib/validation'

/**
 * GET /api/templates/[id]
 * Fetches a specific template by ID with full content.
 *
 * Returns:
 * - id: Template ID
 * - name: Template name
 * - description: Template description
 * - icon: Optional icon
 * - content: Full template content with placeholders
 * - tags: Default tags for this template
 * - createdAt: Template creation timestamp
 *
 * Use case: When user wants to create a note from a template
 *
 * @returns JSON with template data
 * @complexity O(1) - single record lookup
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
        { error: 'Unauthorized', message: 'You must be signed in to view templates.' },
        { status: 401 }
      )
    }

    const templateId = params.id

    // Validate template ID
    if (!isValidId(templateId)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid template ID format.' },
        { status: 400 }
      )
    }

    // Fetch template
    const template = await db.noteTemplate.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Not found', message: 'Template not found.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: template.id,
      name: template.name,
      description: template.description,
      icon: template.icon,
      content: template.content,
      tags: template.tags,
      createdAt: template.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('GET /api/templates/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch template.' },
      { status: 500 }
    )
  }
}

/**
 * FILE: src/app/api/templates/route.ts
 * PURPOSE: Manage note templates for quick note creation.
 * INPUTS: HTTP GET (list templates), POST (create template).
 * OUTPUTS: JSON responses with template data.
 * NOTES: Templates are pre-populated note structures with placeholders.
 *        Users can create custom templates or use system defaults.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { validateTemplateName, validateNoteContent } from '@/lib/validation'

/**
 * GET /api/templates
 * Fetches all available templates ordered by name.
 *
 * Returns templates with:
 * - id: Template ID
 * - name: Template name
 * - description: Template description
 * - icon: Optional emoji/icon
 * - tags: Array of default tags for this template
 * - createdAt: Template creation timestamp
 *
 * @returns JSON with templates array
 * @complexity O(n) where n is number of templates
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check: require valid session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to view templates.' },
        { status: 401 }
      )
    }

    // Fetch all templates
    const templates = await db.noteTemplate.findMany({
      orderBy: {
        name: 'asc',
      },
    })

    // Format templates (hide full content in list view)
    const formattedTemplates = templates.map((template: any) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      icon: template.icon,
      tags: template.tags,
      contentPreview: template.content.slice(0, 100) + (template.content.length > 100 ? '...' : ''),
      createdAt: template.createdAt.toISOString(),
    }))

    return NextResponse.json({
      templates: formattedTemplates,
      total: formattedTemplates.length,
    })
  } catch (error) {
    console.error('GET /api/templates error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch templates.' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/templates
 * Creates a new custom template.
 *
 * Request body:
 * - name: string (required, 1-100 chars)
 * - description: string (optional)
 * - icon: string (optional, emoji or icon identifier)
 * - content: string (required, template content with placeholders)
 * - tags: string[] (optional, default tags for notes created from this template)
 *
 * Validation:
 * - Name must be unique
 * - Content is required and validated
 * - Tags array limited to 20 items
 *
 * @returns JSON with created template
 * @complexity O(1) with unique index on template.name
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check: require valid session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to create templates.' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, description, icon, content, tags } = body

    // Validate required fields
    const validatedName = validateTemplateName(name)
    if (!validatedName) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Template name is required and must be 1-100 characters.',
        },
        { status: 400 }
      )
    }

    const validatedContent = validateNoteContent(content)
    if (!validatedContent) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Template content is required and must be under 1MB.',
        },
        { status: 400 }
      )
    }

    // Validate optional fields
    const validatedDescription =
      description && typeof description === 'string' ? description.trim().slice(0, 500) : null

    const validatedIcon =
      icon && typeof icon === 'string' ? icon.trim().slice(0, 10) : null

    const validatedTags = Array.isArray(tags)
      ? tags
          .filter((tag) => typeof tag === 'string' && tag.length > 0)
          .slice(0, 20)
      : []

    // Check for existing template with same name
    const existingTemplate = await db.noteTemplate.findFirst({
      where: {
        name: {
          equals: validatedName,
          mode: 'insensitive',
        },
      },
    })

    if (existingTemplate) {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: 'A template with this name already exists.',
        },
        { status: 409 }
      )
    }

    // Create new template
    const template = await db.noteTemplate.create({
      data: {
        name: validatedName,
        description: validatedDescription,
        icon: validatedIcon,
        content: validatedContent,
        tags: validatedTags,
      },
    })

    return NextResponse.json(
      {
        id: template.id,
        name: template.name,
        description: template.description,
        icon: template.icon,
        content: template.content,
        tags: template.tags,
        createdAt: template.createdAt.toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/templates error:', error)

    // Handle unique constraint violation
    if ((error as any).code === 'P2002') {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: 'A template with this name already exists.',
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create template.' },
      { status: 500 }
    )
  }
}

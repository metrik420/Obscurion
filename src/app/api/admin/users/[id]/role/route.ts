import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { canManageUser } from '@/lib/permissions'

/**
 * PUT /api/admin/users/[id]/role
 * Change a user's role
 * Only admins can change roles, and they can only change to lower roles
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get admin user
    const admin = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can change user roles' },
        { status: 403 }
      )
    }

    // Get target user
    const targetUser = await db.user.findUnique({
      where: { id: params.id },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { newRole } = body

    // Validate role
    if (!['ADMIN', 'MODERATOR', 'VIP', 'USER'].includes(newRole)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Check if admin can manage this user
    if (!canManageUser(admin.role as any, targetUser.role as any)) {
      return NextResponse.json(
        { error: 'Cannot change role of a user at same level or higher' },
        { status: 403 }
      )
    }

    // Update user role
    const updatedUser = await db.user.update({
      where: { id: params.id },
      data: { role: newRole },
    })

    // Log the action
    await db.auditLog.create({
      data: {
        adminEmail: session.user.email,
        action: 'role_changed',
        resourceType: 'user',
        resourceId: params.id,
        details: JSON.stringify({
          targetEmail: targetUser.email,
          oldRole: targetUser.role,
          newRole: newRole,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      },
    })

    return NextResponse.json({
      message: 'User role updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    })
  } catch (error) {
    console.error('PUT /api/admin/users/[id]/role error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/users/[id]/role
 * Get user's current role
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can view roles
    const admin = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can view user roles' },
        { status: 403 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        isSuspended: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('GET /api/admin/users/[id]/role error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

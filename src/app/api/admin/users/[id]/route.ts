import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/auth-admin'
import { logAdminAction } from '@/lib/audit'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authorization header for NextAuth session
    const cookieHeader = request.headers.get('cookie')
    if (!cookieHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user session via NextAuth
    const baseUrl = request.headers.get('x-forwarded-proto') === 'https' ? `https://${request.headers.get('host')}` : `http://${request.headers.get('host')}`
    const sessionRes = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { cookie: cookieHeader },
    })

    if (!sessionRes.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await sessionRes.json()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if admin
    const adminCheck = await isAdmin(session.user.email)
    if (!adminCheck) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await db.user.findFirst({
      where: {
        OR: [
          { id: params.id },
          { email: params.id }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isSuspended: true,
        suspendedReason: true,
        suspendedAt: true,
        tosAccepted: true,
        tosAcceptedAt: true,
        agreedToTerms: true,
        dataDeleteRequested: true,
        dataDeleteRequestedAt: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
        loginAttempts: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authorization header for NextAuth session
    const cookieHeader = request.headers.get('cookie')
    if (!cookieHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user session via NextAuth
    const baseUrl = request.headers.get('x-forwarded-proto') === 'https' ? `https://${request.headers.get('host')}` : `http://${request.headers.get('host')}`
    const sessionRes = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { cookie: cookieHeader },
    })

    if (!sessionRes.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await sessionRes.json()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if admin
    const adminCheck = await isAdmin(session.user.email)
    if (!adminCheck) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, role, isActive } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (role !== undefined) updateData.role = role
    if (isActive !== undefined) updateData.isActive = isActive

    const user = await db.user.updateMany({
      where: {
        OR: [
          { id: params.id },
          { email: params.id }
        ]
      },
      data: updateData
    })

    if (user.count === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Log action
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown'
    await logAdminAction({
      adminEmail: session.user.email,
      action: 'user_updated',
      resourceType: 'user',
      resourceId: params.id,
      details: updateData,
      ipAddress,
    })

    // Get updated user
    const updatedUser = await db.user.findFirst({
      where: {
        OR: [
          { id: params.id },
          { email: params.id }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authorization header for NextAuth session
    const cookieHeader = request.headers.get('cookie')
    if (!cookieHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user session via NextAuth
    const baseUrl = request.headers.get('x-forwarded-proto') === 'https' ? `https://${request.headers.get('host')}` : `http://${request.headers.get('host')}`
    const sessionRes = await fetch(`${baseUrl}/api/auth/session`, {
      headers: { cookie: cookieHeader },
    })

    if (!sessionRes.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await sessionRes.json()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if admin
    const adminCheck = await isAdmin(session.user.email)
    if (!adminCheck) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get user to find email
    const user = await db.user.findFirst({
      where: {
        OR: [
          { id: params.id },
          { email: params.id }
        ]
      },
      select: { email: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Delete user and cascade delete their data
    await db.user.deleteMany({
      where: {
        OR: [
          { id: params.id },
          { email: params.id }
        ]
      }
    })

    // Log action
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown'
    await logAdminAction({
      adminEmail: session.user.email,
      action: 'user_deleted',
      resourceType: 'user',
      resourceId: params.id,
      details: { userEmail: user.email },
      ipAddress,
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

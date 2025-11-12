import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/auth-admin'
import { logAdminAction } from '@/lib/audit'

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || undefined
    const filter = searchParams.get('filter') || 'all'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    let where: any = {}

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (filter === 'active') {
      where.AND = where.AND || []
      where.AND.push({ isActive: true, isSuspended: false })
    } else if (filter === 'suspended') {
      where.isSuspended = true
    } else if (filter === 'pending-deletion') {
      where.dataDeleteRequested = true
    }

    // Get total count
    const total = await db.user.count({ where })

    // Get users
    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isSuspended: true,
        tosAccepted: true,
        dataDeleteRequested: true,
        createdAt: true,
        lastLogin: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    return NextResponse.json({
      users,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('List users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
    const { email, name, role = 'USER' } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['ADMIN', 'MODERATOR', 'VIP', 'USER'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: ADMIN, MODERATOR, VIP, USER' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      )
    }

    // Create user with default password (should be changed by user)
    const bcrypt = require('bcryptjs')
    const tempPassword = Math.random().toString(36).slice(-12)
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    const user = await db.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        password: hashedPassword,
        role: role as any,
        tosAccepted: true,
        tosAcceptedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    })

    // Log action
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown'
    await logAdminAction({
      adminEmail: session.user.email,
      action: 'user_created',
      resourceType: 'user',
      resourceId: user.id,
      details: { email, role },
      ipAddress,
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/auth-admin'

export async function GET(request: NextRequest) {
  try {
    // Get authorization header for NextAuth session
    const cookieHeader = request.headers.get('cookie')
    if (!cookieHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user session - use relative URL so it works in Docker
    const baseUrl = request.headers.get('x-forwarded-proto') === 'https'
      ? `https://${request.headers.get('host')}`
      : `http://${request.headers.get('host')}`

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

    // Get stats
    const totalUsers = await db.user.count()
    const activeUsers = await db.user.count({
      where: { isActive: true, isSuspended: false }
    })
    const suspendedUsers = await db.user.count({
      where: { isSuspended: true }
    })
    const pendingDeletions = await db.user.count({
      where: { dataDeleteRequested: true }
    })
    const todaySignups = await db.user.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    })

    return NextResponse.json({
      totalUsers,
      activeUsers,
      suspendedUsers,
      pendingDeletions,
      todaySignups
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

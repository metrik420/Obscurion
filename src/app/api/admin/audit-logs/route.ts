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
    const action = searchParams.get('action') || undefined
    const adminEmail = searchParams.get('adminEmail') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    let where: any = {}

    if (action) {
      where.action = {
        contains: action,
        mode: 'insensitive'
      }
    }

    if (adminEmail) {
      where.adminEmail = {
        contains: adminEmail,
        mode: 'insensitive'
      }
    }

    // Get total count
    const total = await db.auditLog.count({ where })

    // Get logs
    const logs = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        adminEmail: true,
        action: true,
        resourceType: true,
        resourceId: true,
        details: true,
        ipAddress: true,
        createdAt: true,
      }
    })

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Get audit logs error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/auth-admin'
import { logAdminAction } from '@/lib/audit'

export async function POST(
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
    const { reason = 'No reason provided' } = body

    const updated = await db.user.updateMany({
      where: {
        OR: [
          { id: params.id },
          { email: params.id }
        ]
      },
      data: {
        isSuspended: true,
        suspendedAt: new Date(),
        suspendedReason: reason,
      }
    })

    if (updated.count === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Log action
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown'
    await logAdminAction({
      adminEmail: session.user.email,
      action: 'user_suspended',
      resourceType: 'user',
      resourceId: params.id,
      details: { reason },
      ipAddress,
    })

    return NextResponse.json({ message: 'User suspended successfully' })
  } catch (error) {
    console.error('Suspend user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logComplianceEvent } from '@/lib/audit'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, tosAccepted, privacyAccepted } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user with TOS acceptance
    const user = await db.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        password: hashedPassword,
        tosAccepted: tosAccepted || false,
        tosAcceptedAt: tosAccepted ? new Date() : null,
        agreedToTerms: privacyAccepted || false,
        agreedToTermsAt: privacyAccepted ? new Date() : null,
      },
    })

    // Log compliance event
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    await logComplianceEvent({
      userEmail: email,
      event: 'signup_with_tos_acceptance',
      details: {
        tosAccepted: tosAccepted || false,
        privacyAccepted: privacyAccepted || false,
      },
      ipAddress,
    })

    return NextResponse.json(
      { message: 'User created successfully', user: { email: user.email, name: user.name } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

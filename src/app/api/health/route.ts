import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json(
      { status: 'healthy', timestamp: new Date() },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy' },
      { status: 503 }
    )
  }
}

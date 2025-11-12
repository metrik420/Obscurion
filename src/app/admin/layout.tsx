'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAdmin } from '@/lib/auth-admin'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get user session
        const res = await fetch('/api/auth/session')
        if (!res.ok) {
          router.push('/auth/signin')
          return
        }

        const session = await res.json()
        if (!session?.user?.email) {
          router.push('/auth/signin')
          return
        }

        // Check if admin
        const adminCheck = await isAdmin(session.user.email)
        if (!adminCheck) {
          router.push('/dashboard')
          return
        }

        setEmail(session.user.email)
        setIsAuthorized(true)
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/auth/signin')
      }
    }

    checkAuth()
  }, [router])

  if (isAuthorized === null) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!isAuthorized) {
    return <div className="min-h-screen flex items-center justify-center">Unauthorized</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <Link href="/admin" className="text-xl font-bold">
                Obscurion Admin
              </Link>
              <div className="flex space-x-4">
                <Link href="/admin" className="hover:text-gray-300 transition">
                  Dashboard
                </Link>
                <Link href="/admin/users" className="hover:text-gray-300 transition">
                  Users
                </Link>
                <Link href="/admin/audit-logs" className="hover:text-gray-300 transition">
                  Audit Logs
                </Link>
                <Link href="/admin/compliance" className="hover:text-gray-300 transition">
                  Compliance
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-300">
                Admin: {email}
              </div>
              <Link
                href="/dashboard"
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm transition"
              >
                Back to Notes
              </Link>
            </div>
          </div>
        </div>
      </nav>
      {children}
    </div>
  )
}

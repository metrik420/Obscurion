'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white shadow-sm">
        <div className="text-2xl font-bold text-indigo-600">Obscurion</div>
        <div className="flex gap-4">
          <Link
            href="/auth/signin"
            className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900">
            Secure Knowledge Management Made Simple
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Obscurion automatically redacts sensitive information from your notes.
            Organize, search, and manage your knowledge base with confidence.
          </p>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            {[
              {
                title: 'Auto-Redaction',
                description: 'Automatically redacts emails, IPs, credentials, and more',
                icon: '🔐',
              },
              {
                title: 'Rich Editing',
                description: 'Create beautiful notes with advanced text formatting',
                icon: '✏️',
              },
              {
                title: 'Smart Search',
                description: 'Find exactly what you need with full-text search',
                icon: '🔍',
              },
              {
                title: 'Flashcards',
                description: 'Auto-generate study flashcards from your notes',
                icon: '📚',
              },
              {
                title: 'Version History',
                description: 'Track changes and restore previous versions anytime',
                icon: '⏱️',
              },
              {
                title: 'Templates',
                description: 'Pre-built templates for common documentation types',
                icon: '📋',
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition"
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12">
            <Link
              href="/auth/signup"
              className="inline-block px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition text-lg"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

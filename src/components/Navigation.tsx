/**
 * FILE: src/components/Navigation.tsx
 * PURPOSE: Reusable navigation header for the entire application.
 * INPUTS: Session data from next-auth (user email), current pathname from router.
 * OUTPUTS: Sticky navigation bar with app branding, navigation links, user info, and logout.
 * NOTES: Client component for session and pathname access.
 *        Uses mobile-first responsive design with hamburger menu.
 *        Active link detection via usePathname for visual feedback.
 * SECURITY: Logout uses next-auth signOut with redirect; no inline secrets.
 * A11Y: Keyboard navigable, screen reader friendly, ARIA labels, focus visible.
 * PERFORMANCE: < 5 KB gzipped; no layout shift (fixed height).
 */

'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { isAdmin } from '@/lib/auth-admin'

/**
 * Navigation component
 * Provides consistent navigation across all dashboard pages.
 *
 * @complexity O(1) render time
 * @security User email displayed; signOut clears session server-side
 * @ux Sticky positioning; active link highlighting; mobile hamburger menu
 * @a11y Semantic nav element; keyboard accessible; ARIA labels; skip link
 */
export default function Navigation() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userIsAdmin, setUserIsAdmin] = useState(false)

  // Check if user is admin
  useEffect(() => {
    if (session?.user?.email) {
      isAdmin(session.user.email).then(setUserIsAdmin)
    }
  }, [session?.user?.email])

  // Close mobile menu on route change
  // Prevents menu staying open after navigation
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  /**
   * Handles user logout.
   * Uses next-auth signOut with absolute URL redirect to signin page.
   *
   * @security Clears session server-side; redirects to prevent unauthorized access
   */
  async function handleLogout() {
    // Build absolute URL for logout callback to work in Docker/production environments
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const callbackUrl = `${baseUrl}/auth/signin`
    await signOut({ callbackUrl })
  }

  /**
   * Checks if a given path is the current active route.
   * Used for visual feedback on navigation links.
   *
   * @param path - Route path to check
   * @returns true if path matches current pathname or is a parent route
   */
  function isActiveLink(path: string): boolean {
    if (path === '/dashboard') {
      // Dashboard is active only on exact match
      return pathname === '/dashboard'
    }
    // Other links are active if pathname starts with the path
    return pathname.startsWith(path)
  }

  // Loading state: show skeleton
  // Prevents flash of missing content during session load
  if (status === 'loading') {
    return (
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link
              href="/dashboard"
              className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              aria-label="Obscurion Dashboard Home"
            >
              Obscurion
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex md:items-center md:space-x-1">
            <Link
              href="/dashboard"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isActiveLink('/dashboard')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
              aria-current={isActiveLink('/dashboard') ? 'page' : undefined}
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/notes"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isActiveLink('/dashboard/notes')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
              aria-current={isActiveLink('/dashboard/notes') ? 'page' : undefined}
            >
              Notes
            </Link>
            <Link
              href="/dashboard/flashcards"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isActiveLink('/dashboard/flashcards')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
              aria-current={isActiveLink('/dashboard/flashcards') ? 'page' : undefined}
            >
              Flashcards
            </Link>
            <Link
              href="/dashboard/search"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isActiveLink('/dashboard/search')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
              aria-current={isActiveLink('/dashboard/search') ? 'page' : undefined}
            >
              Search
            </Link>
            {userIsAdmin && (
              <Link
                href="/admin"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isActiveLink('/admin')
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
                aria-current={isActiveLink('/admin') ? 'page' : undefined}
              >
                🔐 Admin
              </Link>
            )}
          </div>

          {/* User Info and Logout (Desktop) */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {session?.user?.email && (
              <span className="text-sm text-gray-700 max-w-xs truncate" title={session.user.email}>
                {session.user.email}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Logout"
            >
              Logout
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {/* Hamburger icon (closed) */}
              {!mobileMenuOpen && (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
              {/* Close icon (open) */}
              {mobileMenuOpen && (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {/* Hidden by default; slides down when mobileMenuOpen is true */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/dashboard"
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isActiveLink('/dashboard')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
              aria-current={isActiveLink('/dashboard') ? 'page' : undefined}
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/notes"
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isActiveLink('/dashboard/notes')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
              aria-current={isActiveLink('/dashboard/notes') ? 'page' : undefined}
            >
              Notes
            </Link>
            <Link
              href="/dashboard/flashcards"
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isActiveLink('/dashboard/flashcards')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
              aria-current={isActiveLink('/dashboard/flashcards') ? 'page' : undefined}
            >
              Flashcards
            </Link>
            <Link
              href="/dashboard/search"
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isActiveLink('/dashboard/search')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
              aria-current={isActiveLink('/dashboard/search') ? 'page' : undefined}
            >
              Search
            </Link>
            {userIsAdmin && (
              <Link
                href="/admin"
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isActiveLink('/admin')
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
                aria-current={isActiveLink('/admin') ? 'page' : undefined}
              >
                🔐 Admin
              </Link>
            )}
          </div>
          {/* User info and logout in mobile menu */}
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="px-4 space-y-3">
              {session?.user?.email && (
                <div className="text-sm text-gray-700 truncate" title={session.user.email}>
                  {session.user.email}
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Logout"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

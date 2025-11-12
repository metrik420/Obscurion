/**
 * FILE: src/app/dashboard/page.tsx
 * PURPOSE: Main dashboard with stats, recent notes, and quick actions.
 * INPUTS: None (fetches data on server side).
 * OUTPUTS: Dashboard UI with statistics cards and recent notes list.
 * NOTES: Uses React Server Components for initial data fetch.
 *        Client-side interactivity handled by child components.
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import Navigation from '@/components/Navigation'

/**
 * Fetches dashboard statistics for the authenticated user.
 * @param userEmail - User's email address
 * @returns Object with stats (noteCount, categoryCount, flashcardCount)
 */
async function getDashboardStats(userEmail: string) {
  const [noteCount, categories, totalFlashcards] = await Promise.all([
    db.note.count({
      where: {
        authorEmail: userEmail,
      },
    }),
    db.category.findMany({
      include: {
        notes: {
          where: {
            note: {
              authorEmail: userEmail,
            },
          },
        },
      },
    }),
    db.flashcard.count({
      where: {
        note: {
          authorEmail: userEmail,
        },
      },
    }),
  ])

  const categoryCount = categories.filter((cat: any) => cat.notes.length > 0).length

  return {
    noteCount,
    categoryCount,
    flashcardCount: totalFlashcards,
  }
}

/**
 * Fetches recent notes for the authenticated user.
 * @param userEmail - User's email address
 * @param limit - Number of notes to fetch (default: 5)
 * @returns Array of recent notes with metadata
 */
async function getRecentNotes(userEmail: string, limit: number = 5) {
  const notes = await db.note.findMany({
    where: {
      authorEmail: userEmail,
    },
    include: {
      categories: {
        include: {
          category: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: limit,
  })

  return notes.map((note: any) => ({
    id: note.id,
    title: note.title,
    type: note.type,
    readingTime: note.readingTime,
    updatedAt: note.updatedAt,
    categories: note.categories.map((nc: any) => nc.category.name),
  }))
}

/**
 * Dashboard page component.
 * Server-rendered with auth check and data prefetch.
 */
export default async function DashboardPage() {
  // Auth check: redirect to signin if not authenticated
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  const userEmail = session.user.email

  // Fetch dashboard data
  const [stats, recentNotes] = await Promise.all([
    getDashboardStats(userEmail),
    getRecentNotes(userEmail, 5),
  ])

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">Welcome back, {session.user.email}</p>
          </div>

        {/* Quick Actions */}
        <div className="mb-8 flex gap-4">
          <Link href="/dashboard/notes/new">
            <Button variant="primary" size="lg">
              + Create New Note
            </Button>
          </Link>
          <Link href="/dashboard/notes">
            <Button variant="secondary" size="lg">
              View All Notes
            </Button>
          </Link>
          <Link href="/dashboard/search">
            <Button variant="ghost" size="lg">
              Search
            </Button>
          </Link>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Notes</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.noteCount}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📝</span>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Categories</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.categoryCount}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🏷️</span>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Flashcards</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stats.flashcardCount}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🎴</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Recent Notes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Recent Notes</h2>
              <Link href="/dashboard/notes">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            {recentNotes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No notes yet. Create your first note to get started!</p>
                <Link href="/dashboard/notes/new">
                  <Button variant="primary">Create First Note</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentNotes.map((note: any) => (
                  <Link
                    key={note.id}
                    href={`/dashboard/notes/${note.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{note.title}</h3>
                        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">{note.type}</span>
                          <span>{note.readingTime}m read</span>
                          <span>
                            Updated {new Date(note.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        {note.categories.length > 0 && (
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {note.categories.map((category: string) => (
                              <span
                                key={category}
                                className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                              >
                                {category}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
        </div>
      </div>
    </>
  )
}

/**
 * FILE: src/app/dashboard/notes/client.tsx
 * PURPOSE: Client component wrapper for notes list with useSearchParams.
 * INPUTS: URL search params (page, sortBy, sortOrder, categoryId).
 * OUTPUTS: Paginated table of notes with actions.
 * NOTES: Extracted from page.tsx to handle useSearchParams within Suspense boundary.
 *        This component is wrapped in Suspense by the parent page.tsx.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Navigation from '@/components/Navigation'

interface Note {
  id: string
  title: string
  type: string
  readingTime: number
  categories: string[]
  updatedAt: string
  flashcardCount: number
}

/**
 * NotesListClient component
 * Handles note list display with filtering, sorting, and bulk actions.
 * Uses useSearchParams which requires Suspense boundary in parent.
 *
 * @complexity O(n) for rendering where n is number of notes per page
 * @security Notes are filtered by user email server-side (API route)
 */
export default function NotesListClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set())

  // Extract URL params (done outside useEffect to avoid stale closures)
  const page = parseInt(searchParams.get('page') || '1')
  const sortBy = searchParams.get('sortBy') || 'updatedAt'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  /**
   * Fetches notes from API with current filters and pagination.
   * Stabilized with useCallback to prevent infinite useEffect loops.
   *
   * @complexity O(1) API call + O(n) JSON parsing
   */
  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        sortBy,
        sortOrder,
      })

      const response = await fetch(`/api/notes?${params}`)
      if (!response.ok) throw new Error('Failed to fetch notes')

      const data = await response.json()
      setNotes(data.notes)
      setPagination(data.pagination)
      setError('')
    } catch (err) {
      setError('Failed to load notes. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [page, sortBy, sortOrder])

  // Fetch notes when filters change
  // Dependencies now include fetchNotes (stable via useCallback)
  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  /**
   * Deletes a note after user confirmation.
   * @param id - Note ID to delete
   */
  async function deleteNote(id: string) {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const response = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete note')

      fetchNotes()
    } catch (err) {
      alert('Failed to delete note')
    }
  }

  /**
   * Toggles selection for all notes in current page.
   */
  function toggleSelectAll() {
    if (selectedNotes.size === notes.length) {
      setSelectedNotes(new Set())
    } else {
      setSelectedNotes(new Set(notes.map((n) => n.id)))
    }
  }

  /**
   * Toggles selection for a single note.
   * @param id - Note ID to toggle
   */
  function toggleSelect(id: string) {
    const newSelected = new Set(selectedNotes)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedNotes(newSelected)
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-600">Loading notes...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notes</h1>
            <p className="mt-2 text-gray-600">{pagination.total} total notes</p>
          </div>
          <Link href="/dashboard/notes/new">
            <Button variant="primary" size="lg">
              + New Note
            </Button>
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {selectedNotes.size > 0 && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <span className="text-blue-700">
              {selectedNotes.size} note{selectedNotes.size > 1 ? 's' : ''} selected
            </span>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (confirm(`Delete ${selectedNotes.size} notes?`)) {
                  selectedNotes.forEach((id) => deleteNote(id))
                  setSelectedNotes(new Set())
                }
              }}
            >
              Delete Selected
            </Button>
          </div>
        )}

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedNotes.size === notes.length && notes.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Categories
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Reading Time
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {notes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No notes found. Create your first note to get started!
                    </td>
                  </tr>
                ) : (
                  notes.map((note) => (
                    <tr key={note.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedNotes.has(note.id)}
                          onChange={() => toggleSelect(note.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/notes/${note.id}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {note.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {note.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {note.categories.slice(0, 2).map((cat) => (
                            <span
                              key={cat}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                            >
                              {cat}
                            </span>
                          ))}
                          {note.categories.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{note.categories.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {note.readingTime}m
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/api/export?format=markdown&noteId=${note.id}`)}
                          className="mr-2"
                        >
                          Export
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => deleteNote(note.id)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => router.push(`/dashboard/notes?page=${pagination.page - 1}`)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => router.push(`/dashboard/notes?page=${pagination.page + 1}`)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  )
}

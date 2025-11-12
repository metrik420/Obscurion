/**
 * FILE: src/app/dashboard/notes/[id]/page.tsx
 * PURPOSE: Note editor page with auto-save, version history, and category management.
 * INPUTS: Route param [id] (note ID or 'new').
 * OUTPUTS: Note editor UI with live preview and metadata.
 * NOTES: Client component with debounced auto-save (2s).
 *        Displays redacted content and version history sidebar.
 *        Enhanced with console logging for flashcard debugging.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import Navigation from '@/components/Navigation'

interface Note {
  id: string
  title: string
  content: string
  type: string
  readingTime: number
  categories: string[]
  categoryIds: string[]
  flashcardCount: number
  versionCount: number
  updatedAt: string
}

interface Flashcard {
  id: string
  question: string
  answer: string
  difficulty: string
  createdAt?: string
}

interface FlashcardFormData {
  question: string
  answer: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
}

interface Version {
  id: string
  title: string
  content: string
  createdAt: string
}

export default function NoteEditorPage() {
  const router = useRouter()
  const params = useParams()
  const noteId = params.id as string
  const isNew = noteId === 'new'

  const [note, setNote] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [type, setType] = useState('GENERAL')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [showFlashcards, setShowFlashcards] = useState(false)
  const [loadingFlashcards, setLoadingFlashcards] = useState(false)
  const [creatingFlashcard, setCreatingFlashcard] = useState(false)
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null)
  const [flashcardError, setFlashcardError] = useState('')
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false)
  const [flashcardFormData, setFlashcardFormData] = useState<FlashcardFormData>({
    question: '',
    answer: '',
    difficulty: 'MEDIUM',
  })
  const [versions, setVersions] = useState<Version[]>([])
  const [showVersions, setShowVersions] = useState(false)
  const [loadingVersions, setLoadingVersions] = useState(false)

  // Phase 2: Advanced metadata fields
  const [tags, setTags] = useState<string[]>([])
  const [status, setStatus] = useState<string>('ACTIVE')
  const [isPinned, setIsPinned] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [availableCategories, setAvailableCategories] = useState<Array<{id: string; name: string}>>([])
  const [tagsInput, setTagsInput] = useState('')

  /**
   * Fetches note data from API.
   * Stabilized with useCallback for dependency tracking.
   *
   * @complexity O(1) API call + O(n) JSON parsing
   */
  const fetchNote = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/notes?id=${noteId}`)
      if (!response.ok) throw new Error('Failed to fetch note')

      const data = await response.json()
      const noteData = data.notes[0]
      console.log('[Frontend] Note data fetched:', {
        id: noteData.id,
        flashcardCount: noteData.flashcardCount,
        title: noteData.title,
      })
      setNote(noteData)
      setTitle(noteData.title)
      setContent(noteData.content)
      setType(noteData.type)
      setTags(noteData.tags || [])
      setStatus(noteData.status || 'ACTIVE')
      setIsPinned(noteData.isPinned || false)
      setSelectedCategories(noteData.categoryIds || [])
      setError('')
    } catch (err) {
      console.error('[Frontend] Error fetching note:', err)
      setError('Failed to load note. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [noteId])

  /**
   * Saves note (create or update).
   * Stabilized with useCallback for dependency tracking.
   *
   * @complexity O(1) API call
   */
  const saveNote = useCallback(async () => {
    console.log('[Frontend] Saving note...')
    try {
      setSaving(true)

      const payload = {
        title,
        content,
        type,
        tags,
        status,
        isPinned,
        categoryIds: selectedCategories,
        ...(isNew ? {} : { id: noteId }),
      }

      const method = isNew ? 'POST' : 'PUT'
      const response = await fetch('/api/notes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to save note')

      const data = await response.json()
      console.log('[Frontend] Note saved successfully:', {
        id: data.id,
        flashcardCount: data.flashcardCount,
      })

      if (isNew) {
        router.push(`/dashboard/notes/${data.id}`)
      } else {
        setNote(data)
        setLastSaved(new Date())
      }

      setError('')
    } catch (err) {
      console.error('[Frontend] Error saving note:', err)
      setError('Failed to save note. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [title, content, type, tags, status, isPinned, selectedCategories, isNew, noteId, router])

  /**
   * Fetches available categories for category management.
   */
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories')
      if (!response.ok) throw new Error('Failed to fetch categories')
      const data = await response.json()
      setAvailableCategories(data.categories || [])
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }, [])

  // Fetch note and categories on mount
  useEffect(() => {
    if (!isNew) {
      fetchNote()
    }
    fetchCategories()
  }, [isNew, fetchNote, fetchCategories])

  // Debounced auto-save when content changes
  // Dependencies now properly include all values used in effect
  useEffect(() => {
    if (isNew || !note) return

    const timeout = setTimeout(() => {
      if (title !== note.title || content !== note.content || type !== note.type) {
        saveNote()
      }
    }, 2000)

    return () => clearTimeout(timeout)
  }, [title, content, type, tags, status, isPinned, selectedCategories, isNew, note, saveNote])

  /**
   * Fetches flashcards for the current note.
   * Enhanced with console logging for debugging.
   */
  const fetchFlashcards = useCallback(async () => {
    console.log('[Frontend] Fetching flashcards for note:', noteId)
    try {
      setLoadingFlashcards(true)
      const response = await fetch(`/api/notes/${noteId}/flashcards`)
      console.log('[Frontend] Flashcard fetch response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[Frontend] Flashcard fetch failed:', errorData)
        throw new Error('Failed to fetch flashcards')
      }

      const data = await response.json()
      console.log('[Frontend] Received flashcards:', data.flashcards?.length || 0)

      if (data.flashcards && data.flashcards.length > 0) {
        console.log('[Frontend] First flashcard:', {
          question: data.flashcards[0].question.substring(0, 50),
          difficulty: data.flashcards[0].difficulty,
        })
      }

      setFlashcards(data.flashcards || [])
    } catch (err) {
      console.error('[Frontend] Error fetching flashcards:', err)
      setError('Failed to load flashcards')
    } finally {
      setLoadingFlashcards(false)
    }
  }, [noteId])

  /**
   * Fetches version history for the current note.
   */
  const fetchVersions = useCallback(async () => {
    try {
      setLoadingVersions(true)
      const response = await fetch(`/api/notes/${noteId}/versions`)
      if (!response.ok) throw new Error('Failed to fetch versions')
      const data = await response.json()
      setVersions(data.versions || [])
    } catch (err) {
      setError('Failed to load versions')
    } finally {
      setLoadingVersions(false)
    }
  }, [noteId])

  /**
   * Restores note to a previous version.
   */
  const restoreVersion = useCallback(async (versionId: string) => {
    if (!confirm('Are you sure you want to restore this version?')) return

    try {
      setSaving(true)
      const response = await fetch(`/api/notes/${noteId}/versions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      })

      if (!response.ok) throw new Error('Failed to restore version')
      const data = await response.json()
      setTitle(data.title)
      setContent(data.content)
      setType(data.type)
      setNote(data)
      setShowVersions(false)
    } catch (err) {
      setError('Failed to restore version')
    } finally {
      setSaving(false)
    }
  }, [noteId])

  /**
   * Creates a new flashcard for the current note.
   * Validates input on client side before API call.
   *
   * @complexity O(1) API call + O(n) state update
   */
  const createFlashcard = useCallback(async () => {
    // Client-side validation
    if (!flashcardFormData.question.trim()) {
      setFlashcardError('Question is required')
      return
    }
    if (!flashcardFormData.answer.trim()) {
      setFlashcardError('Answer is required')
      return
    }
    if (flashcardFormData.question.length > 255) {
      setFlashcardError('Question must be 255 characters or less')
      return
    }
    if (flashcardFormData.answer.length > 5000) {
      setFlashcardError('Answer must be 5000 characters or less')
      return
    }

    try {
      setCreatingFlashcard(true)
      setFlashcardError('')

      const response = await fetch(`/api/notes/${noteId}/flashcards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flashcardFormData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create flashcard')
      }

      // Add new flashcard to the beginning of the list
      setFlashcards((prev) => [data.flashcard, ...prev])

      // Reset form
      setFlashcardFormData({
        question: '',
        answer: '',
        difficulty: 'MEDIUM',
      })

      // Update note metadata if available
      if (note) {
        setNote({ ...note, flashcardCount: note.flashcardCount + 1 })
      }
    } catch (err) {
      setFlashcardError(err instanceof Error ? err.message : 'Failed to create flashcard')
    } finally {
      setCreatingFlashcard(false)
    }
  }, [noteId, flashcardFormData, note])

  /**
   * Deletes a flashcard by ID.
   * Prompts user for confirmation before deletion.
   *
   * @complexity O(1) API call + O(n) state update
   */
  const deleteFlashcard = useCallback(async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this flashcard?')) return

    try {
      setDeletingCardId(cardId)
      setFlashcardError('')

      const response = await fetch(`/api/notes/${noteId}/flashcards/${cardId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete flashcard')
      }

      // Remove flashcard from list
      setFlashcards((prev) => prev.filter((card) => card.id !== cardId))

      // Update note metadata if available
      if (note) {
        setNote({ ...note, flashcardCount: Math.max(0, note.flashcardCount - 1) })
      }
    } catch (err) {
      setFlashcardError(err instanceof Error ? err.message : 'Failed to delete flashcard')
    } finally {
      setDeletingCardId(null)
    }
  }, [noteId, note])

  /**
   * Auto-generates flashcards from note content using smart extraction.
   * Calls the API to generate flashcards based on note structure.
   */
  const generateFlashcards = useCallback(async () => {
    try {
      setGeneratingFlashcards(true)
      setFlashcardError('')

      const response = await fetch(`/api/notes/${noteId}/flashcards/generate`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate flashcards')
      }

      if (data.flashcards && data.flashcards.length > 0) {
        alert(
          `Generated ${data.flashcards.length} flashcards!\n\nWould you like to save them?`
        )
        // Add them to the current list for preview
        setFlashcards((prev) => [...data.flashcards, ...prev])

        // Update note metadata
        if (note) {
          setNote({
            ...note,
            flashcardCount: note.flashcardCount + data.flashcards.length,
          })
        }
      } else {
        setFlashcardError('Could not generate flashcards from this note content')
      }
    } catch (err) {
      setFlashcardError(
        err instanceof Error ? err.message : 'Failed to generate flashcards'
      )
    } finally {
      setGeneratingFlashcards(false)
    }
  }, [noteId, note])

  /**
   * Copies note content to clipboard.
   * Uses modern Clipboard API with error handling.
   */
  async function handleCopyToClipboard() {
    try {
      await navigator.clipboard.writeText(content)
      alert('Content copied to clipboard!')
    } catch (err) {
      alert('Failed to copy content')
    }
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-600">Loading note...</div>
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
            <h1 className="text-3xl font-bold text-gray-900">
              {isNew ? 'Create New Note' : 'Edit Note'}
            </h1>
            {lastSaved && (
              <p className="mt-2 text-sm text-gray-600">
                Last saved: {lastSaved.toLocaleTimeString()}
              </p>
            )}
            {saving && <p className="mt-2 text-sm text-blue-600">Saving...</p>}
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" onClick={() => router.push('/dashboard/notes')}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveNote} disabled={saving}>
              {isNew ? 'Create Note' : 'Save Now'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-gray-900">Note Content</h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <Input
                    label="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter note title..."
                    required
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="GENERAL">General</option>
                      <option value="JOURNAL">Journal</option>
                      <option value="VPS">VPS</option>
                      <option value="DEDICATED">Dedicated Server</option>
                      <option value="SHARED">Shared Hosting</option>
                      <option value="INCIDENT">Incident Report</option>
                      <option value="DOCUMENTATION">Documentation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write your note here... Sensitive data (emails, IPs, credentials) will be automatically redacted."
                      rows={20}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleCopyToClipboard}>
                      Copy to Clipboard
                    </Button>
                    {!isNew && (
                      <Button
                        variant="ghost"
                        onClick={() => window.open(`/api/export?format=markdown&noteId=${noteId}`)}
                      >
                        Export Markdown
                      </Button>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="space-y-6">
            {!isNew && note && (
              <>
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold text-gray-900">Metadata & Status</h3>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-4">
                      {/* Read-only metadata */}
                      <div className="space-y-2 text-sm border-b pb-4">
                        <div>
                          <span className="font-medium">Reading Time:</span> {note.readingTime}m
                        </div>
                        <div>
                          <span className="font-medium">Flashcards:</span> {note.flashcardCount}
                        </div>
                        <div>
                          <span className="font-medium">Versions:</span> {note.versionCount}
                        </div>
                        <div>
                          <span className="font-medium">Last Updated:</span>{' '}
                          {new Date(note.updatedAt).toLocaleString()}
                        </div>
                      </div>

                      {/* Pin Toggle */}
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={isPinned}
                            onChange={(e) => setIsPinned(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span className="text-sm font-medium text-gray-700">Pin this note</span>
                        </label>
                      </div>

                      {/* Status Selector */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Status
                        </label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="ARCHIVED">Archived</option>
                          <option value="DRAFT">Draft</option>
                        </select>
                      </div>

                      {/* Tags Input */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tags
                        </label>
                        <input
                          type="text"
                          value={tagsInput}
                          placeholder="Enter tags separated by commas (e.g., javascript, react)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                          onChange={(e) => setTagsInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const newTags = tagsInput
                                .split(',')
                                .map((t) => t.trim())
                                .filter((t) => t.length > 0 && !tags.includes(t))
                              setTags([...tags, ...newTags])
                              setTagsInput('')
                            }
                          }}
                        />
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium flex items-center gap-1"
                              >
                                {tag}
                                <button
                                  onClick={() => setTags(tags.filter((t) => t !== tag))}
                                  className="font-bold cursor-pointer hover:text-purple-900"
                                  aria-label={`Remove tag ${tag}`}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <h3 className="font-semibold text-gray-900">Categories</h3>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-3">
                      {/* Available Categories Selector */}
                      {availableCategories.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-600 uppercase">Available</p>
                          <div className="space-y-2">
                            {availableCategories.map((category) => (
                              <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedCategories.includes(category.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedCategories([...selectedCategories, category.id])
                                    } else {
                                      setSelectedCategories(selectedCategories.filter((id) => id !== category.id))
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-gray-300"
                                />
                                <span className="text-sm text-gray-700">{category.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Selected Categories Display */}
                      {selectedCategories.length > 0 && (
                        <div className="border-t pt-3">
                          <p className="text-xs font-medium text-gray-600 uppercase mb-2">Assigned</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedCategories.map((categoryId) => {
                              const category = availableCategories.find((c) => c.id === categoryId)
                              return category ? (
                                <span
                                  key={categoryId}
                                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                                >
                                  {category.name}
                                </span>
                              ) : null
                            })}
                          </div>
                        </div>
                      )}

                      {availableCategories.length === 0 && selectedCategories.length === 0 && (
                        <p className="text-sm text-gray-500 italic">No categories available</p>
                      )}
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <h3 className="font-semibold text-gray-900">Quick Actions</h3>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => router.push(`/dashboard/versions?noteId=${noteId}`)}
                      >
                        View Version History ({note.versionCount})
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          setShowVersions(!showVersions)
                          if (!showVersions && versions.length === 0) {
                            fetchVersions()
                          }
                        }}
                      >
                        {showVersions ? '← Hide' : 'Quick View'} Recent Versions
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => router.push(`/dashboard/flashcards?noteId=${noteId}`)}
                      >
                        Manage Flashcards ({note.flashcardCount})
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          console.log('[Frontend] Toggling flashcard display')
                          setShowFlashcards(!showFlashcards)
                          if (!showFlashcards && flashcards.length === 0) {
                            console.log('[Frontend] Triggering flashcard fetch')
                            fetchFlashcards()
                          }
                        }}
                      >
                        {showFlashcards ? '← Hide' : 'Quick View'} Flashcards
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={generateFlashcards}
                        disabled={generatingFlashcards || !content.trim()}
                      >
                        {generatingFlashcards ? 'Generating...' : '✨ Generate Flashcards'}
                      </Button>
                    </div>
                  </CardBody>
                </Card>

                {showFlashcards && (
                  <Card>
                    <CardHeader>
                      <h3 className="font-semibold text-gray-900">Flashcards</h3>
                    </CardHeader>
                    <CardBody>
                      {/* Flashcard Creation Form */}
                      <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                          Create New Flashcard
                        </h4>

                        {flashcardError && (
                          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                            {flashcardError}
                          </div>
                        )}

                        <div className="space-y-3">
                          <div>
                            <label
                              htmlFor="flashcard-question"
                              className="block text-xs font-medium text-gray-700 mb-1"
                            >
                              Question <span className="text-red-500">*</span>
                            </label>
                            <input
                              id="flashcard-question"
                              type="text"
                              value={flashcardFormData.question}
                              onChange={(e) =>
                                setFlashcardFormData((prev) => ({
                                  ...prev,
                                  question: e.target.value,
                                }))
                              }
                              placeholder="What is the capital of France?"
                              maxLength={255}
                              disabled={creatingFlashcard}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {flashcardFormData.question.length}/255 characters
                            </p>
                          </div>

                          <div>
                            <label
                              htmlFor="flashcard-answer"
                              className="block text-xs font-medium text-gray-700 mb-1"
                            >
                              Answer <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              id="flashcard-answer"
                              value={flashcardFormData.answer}
                              onChange={(e) =>
                                setFlashcardFormData((prev) => ({
                                  ...prev,
                                  answer: e.target.value,
                                }))
                              }
                              placeholder="Paris"
                              rows={3}
                              maxLength={5000}
                              disabled={creatingFlashcard}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {flashcardFormData.answer.length}/5000 characters
                            </p>
                          </div>

                          <div>
                            <label
                              htmlFor="flashcard-difficulty"
                              className="block text-xs font-medium text-gray-700 mb-1"
                            >
                              Difficulty
                            </label>
                            <select
                              id="flashcard-difficulty"
                              value={flashcardFormData.difficulty}
                              onChange={(e) =>
                                setFlashcardFormData((prev) => ({
                                  ...prev,
                                  difficulty: e.target.value as 'EASY' | 'MEDIUM' | 'HARD',
                                }))
                              }
                              disabled={creatingFlashcard}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
                            >
                              <option value="EASY">Easy</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="HARD">Hard</option>
                            </select>
                          </div>

                          <Button
                            variant="primary"
                            onClick={createFlashcard}
                            disabled={creatingFlashcard}
                            className="w-full"
                          >
                            {creatingFlashcard ? 'Creating...' : 'Add Flashcard'}
                          </Button>
                        </div>
                      </div>

                      {/* Flashcard List */}
                      {loadingFlashcards ? (
                        <p className="text-sm text-gray-600">Loading flashcards...</p>
                      ) : flashcards.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          No flashcards yet. Create one using the form above!
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {flashcards.map((card) => (
                            <div
                              key={card.id}
                              className="p-3 border border-gray-200 rounded-lg bg-gray-50"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <p className="text-xs font-semibold text-gray-600 uppercase flex-1">
                                  Q: {card.question}
                                </p>
                                <div className="flex items-center gap-2 ml-2">
                                  <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 whitespace-nowrap">
                                    {card.difficulty}
                                  </span>
                                  <button
                                    onClick={() => deleteFlashcard(card.id)}
                                    disabled={deletingCardId === card.id}
                                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
                                    aria-label="Delete flashcard"
                                  >
                                    {deletingCardId === card.id ? 'Deleting...' : 'Delete'}
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                                A: {card.answer}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                )}

                {showVersions && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Recent Versions</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/versions?noteId=${noteId}`)}
                        >
                          View All
                        </Button>
                      </div>
                    </CardHeader>
                    <CardBody>
                      {loadingVersions ? (
                        <p className="text-sm text-gray-600">Loading versions...</p>
                      ) : versions.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-500 mb-3">No version history yet.</p>
                          <p className="text-xs text-gray-400">
                            Versions are created automatically when you edit notes.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {versions.slice(0, 3).map((version: any, index: number) => (
                            <div
                              key={version.id}
                              className="p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm text-gray-900">
                                    Version {versions.length - index}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {new Date(version.createdAt).toLocaleString()}
                                  </p>
                                  {version.user && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      by {version.user.name || version.user.email}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={() => restoreVersion(version.id)}
                                  disabled={saving}
                                  className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 disabled:opacity-50 transition whitespace-nowrap ml-2"
                                  aria-label="Restore this version"
                                >
                                  Restore
                                </button>
                              </div>
                              <p className="text-sm text-gray-700 font-medium mb-1 truncate">
                                {version.title}
                              </p>
                              <p className="text-xs text-gray-600 line-clamp-2">
                                {version.contentPreview || version.content?.substring(0, 150) || 'Empty content'}
                              </p>
                            </div>
                          ))}
                          {versions.length > 3 && (
                            <button
                              onClick={() => router.push(`/dashboard/versions?noteId=${noteId}`)}
                              className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                              View all {versions.length} versions →
                            </button>
                          )}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
        </div>
      </div>
    </>
  )
}

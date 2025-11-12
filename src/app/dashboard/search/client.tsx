/**
 * FILE: src/app/dashboard/search/client.tsx
 * PURPOSE: Client component wrapper for search page with useSearchParams.
 * INPUTS: Search query (q) and category filter from URL params.
 * OUTPUTS: Search results with highlighted matches and metadata.
 * NOTES: Extracted from page.tsx to handle useSearchParams within Suspense boundary.
 *        Client component with live search as user types (debounced 500ms).
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardBody } from '@/components/ui/card'
import Navigation from '@/components/Navigation'

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param text - Text to escape
 * @returns HTML-escaped text
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}

/**
 * Safely highlights text by escaping HTML and then wrapping matches in mark tags
 * Uses the marker syntax from the API: **term**
 * @param text - Text to highlight (with **term** markers)
 * @returns React fragment with safe HTML highlighting
 */
function HighlightedText({ text }: { text: string }) {
  // Split by the marker pattern: **text**
  const parts = text.split(/(\*\*.+?\*\*)/g)

  return (
    <>
      {parts.map((part, index) => {
        // Check if this part is a marker (starts and ends with **)
        if (part.startsWith('**') && part.endsWith('**')) {
          // Extract the highlighted text (remove ** markers)
          const highlighted = part.slice(2, -2)
          return (
            <mark key={index} className="bg-yellow-200">
              {escapeHtml(highlighted)}
            </mark>
          )
        }
        // Regular text - escape HTML entities
        return escapeHtml(part)
      })}
    </>
  )
}

interface SearchResult {
  id: string
  title: string
  snippet: string
  type: string
  status: string
  tags: string[]
  isPinned: boolean
  readingTime: number
  categories: string[]
  matchedIn: string
  updatedAt: string
}

interface Category {
  id: string
  name: string
  noteCount: number
}

interface FilterOptions {
  tags: Array<{ name: string; count: number }>
  statuses: Array<{ value: string; label: string; count: number }>
  categories: Array<{ id: string; name: string; count: number }>
  pinnedNotes: { available: boolean; count: number }
  totalNotes: number
}

/**
 * SearchPageClient component
 * Handles full-text search with category filtering and debounced input.
 * Uses useSearchParams which requires Suspense boundary in parent.
 *
 * @complexity O(n) for rendering where n is number of search results
 * @security Search filtered by user email server-side (API route)
 */
export default function SearchPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [showPinnedOnly, setShowPinnedOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  })

  /**
   * Fetches filter options (tags, statuses, categories, etc).
   * Used to populate filter sidebar with available options and counts.
   *
   * @complexity O(1) API call + O(n) JSON parsing
   */
  const fetchFilterOptions = useCallback(async () => {
    try {
      const response = await fetch('/api/filters')

      // Handle 401 Unauthorized - redirect to signin
      if (response.status === 401) {
        window.location.href = '/auth/signin'
        return
      }

      if (!response.ok) throw new Error('Failed to fetch filter options')

      const data = await response.json()
      setFilterOptions(data)
      setCategories(
        data.categories.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          noteCount: cat.count,
        }))
      )
    } catch (err) {
      console.error('Failed to load filter options:', err)
    }
  }, [])

  /**
   * Performs search API call with current query and filters.
   * Stabilized with useCallback to prevent infinite useEffect loops.
   * Includes Phase 2 filters: tags, status, pinned notes.
   * Supports pagination with page parameter.
   *
   * @param page - Page number (1-indexed). Defaults to 1.
   * @complexity O(1) API call + O(n) JSON parsing
   */
  const performSearch = useCallback(
    async (page = 1) => {
      try {
        setLoading(true)
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
        })

      // Add query if provided (Phase 2 allows empty query)
      if (query && query.length > 0) {
        params.append('q', query)
      }

      // Add filters
      if (selectedCategory) {
        params.append('categoryId', selectedCategory)
      }

      if (selectedStatus) {
        params.append('status', selectedStatus)
      }

      if (selectedTags.size > 0) {
        params.append('tags', Array.from(selectedTags).join(','))
      }

      if (showPinnedOnly) {
        params.append('pinned', 'true')
      }

      const response = await fetch(`/api/search?${params}`)

      // Handle 401 Unauthorized - redirect to signin
      if (response.status === 401) {
        window.location.href = '/auth/signin'
        return
      }

      if (!response.ok) throw new Error('Failed to search')

      const data = await response.json()
      setResults(data.results)
      setPagination(data.pagination)
      setError('')
    } catch (err) {
      setError('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
    },
    [query, selectedCategory, selectedStatus, selectedTags, showPinnedOnly]
  )

  // Fetch filter options on mount
  useEffect(() => {
    fetchFilterOptions()
  }, [fetchFilterOptions])

  // Debounced search when query or filters change
  // Uses performSearch stable function reference
  useEffect(() => {
    // Allow empty query with filters (Phase 2 feature)
    const hasFilters = selectedCategory || selectedStatus || selectedTags.size > 0 || showPinnedOnly
    if (query.length < 1 && !hasFilters) {
      setResults([])
      return
    }

    const timeout = setTimeout(() => {
      performSearch()
    }, 500)

    return () => clearTimeout(timeout)
  }, [query, selectedCategory, selectedStatus, selectedTags, showPinnedOnly, performSearch])

  /**
   * Handles category filter selection.
   * @param categoryId - Selected category ID or null for all categories
   */
  function handleCategoryFilter(categoryId: string | null) {
    setSelectedCategory(categoryId)
  }

  /**
   * Handles tag filter selection (toggle).
   * @param tag - Tag to toggle
   */
  function handleTagFilter(tag: string) {
    const newTags = new Set(selectedTags)
    if (newTags.has(tag)) {
      newTags.delete(tag)
    } else {
      newTags.add(tag)
    }
    setSelectedTags(newTags)
  }

  /**
   * Handles status filter selection.
   * @param status - Status to filter by, or null for all statuses
   */
  function handleStatusFilter(status: string | null) {
    setSelectedStatus(status)
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Search Notes</h1>
          <p className="mt-2 text-gray-600">
            Search across all your notes by title or content
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1 space-y-4">
            {/* Pinned Notes Filter */}
            {filterOptions?.pinnedNotes.available && (
              <Card>
                <CardBody>
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm">Pinned Notes</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPinnedOnly}
                      onChange={(e) => setShowPinnedOnly(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      Show pinned only ({filterOptions?.pinnedNotes.count})
                    </span>
                  </label>
                </CardBody>
              </Card>
            )}

            {/* Status Filter */}
            {filterOptions && filterOptions.statuses.length > 0 && (
              <Card>
                <CardBody>
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm">Status</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleStatusFilter(null)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${
                        selectedStatus === null
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      All Statuses
                    </button>
                    {filterOptions.statuses.map((status) => (
                      <button
                        key={status.value}
                        onClick={() => handleStatusFilter(status.value)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition flex items-center justify-between ${
                          selectedStatus === status.value
                            ? 'bg-blue-100 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span>{status.label}</span>
                        <span className="text-xs text-gray-500">{status.count}</span>
                      </button>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Tags Filter */}
            {filterOptions && filterOptions.tags.length > 0 && (
              <Card>
                <CardBody>
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm">Tags</h3>
                  <div className="space-y-2">
                    {filterOptions.tags.slice(0, 10).map((tag) => (
                      <label key={tag.name} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTags.has(tag.name)}
                          onChange={() => handleTagFilter(tag.name)}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-gray-700 flex-1">{tag.name}</span>
                        <span className="text-xs text-gray-500">{tag.count}</span>
                      </label>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Category Filter */}
            {categories.length > 0 && (
              <Card>
                <CardBody>
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm">Categories</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleCategoryFilter(null)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${
                        selectedCategory === null
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      All Categories
                    </button>
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryFilter(category.id)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition flex items-center justify-between ${
                          selectedCategory === category.id
                            ? 'bg-blue-100 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span>{category.name}</span>
                        <span className="text-xs text-gray-500">{category.noteCount}</span>
                      </button>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>

          {/* Main Content - Search and Results */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notes by title or content..."
                className="text-lg"
              />
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {loading && (
              <div className="text-center py-12">
                <div className="text-gray-600">Searching...</div>
              </div>
            )}

            {!loading && query.length > 0 && results.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-600">No results found for "{query}"</div>
                <p className="mt-2 text-sm text-gray-500">
                  Try different keywords or remove filters
                </p>
              </div>
            )}

            {!loading && results.length > 0 && (
              <>
                <div className="mb-4 text-sm text-gray-600">
                  Found {pagination.total} result{pagination.total !== 1 ? 's' : ''} for "
                  {query}"
                </div>

                <div className="space-y-4">
                  {results.map((result) => (
                    <Card key={result.id}>
                      <CardBody>
                        <Link
                          href={`/dashboard/notes/${result.id}`}
                          className="block hover:bg-gray-50 transition"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {/* Title with highlighting */}
                              <h3 className="text-lg font-medium text-blue-600 hover:underline mb-2">
                                <HighlightedText text={result.title} />
                              </h3>

                              {/* Snippet with highlighting */}
                              <p className="text-gray-700 text-sm mb-3">
                                <HighlightedText text={result.snippet} />
                              </p>

                              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-2">
                                {result.isPinned && (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                                    📌 Pinned
                                  </span>
                                )}
                                <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                                  {result.type}
                                </span>
                                <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                                  {result.status}
                                </span>
                                <span>{result.readingTime}m read</span>
                                <span>
                                  Updated {new Date(result.updatedAt).toLocaleDateString()}
                                </span>
                              </div>

                              {(result.tags.length > 0 || result.categories.length > 0) && (
                                <div className="mt-2 flex gap-2 flex-wrap">
                                  {result.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                  {result.categories.map((category) => (
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
                          </div>
                        </Link>
                      </CardBody>
                    </Card>
                  ))}
                </div>

                {/* Pagination Controls */}
                {pagination.total > 0 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Showing {Math.min((pagination.page - 1) * 20 + 1, pagination.total)} to{' '}
                      {Math.min(pagination.page * 20, pagination.total)} of {pagination.total} results
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => performSearch(pagination.page - 1)}
                        disabled={pagination.page === 1 || loading}
                        className="focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        ← Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-600">
                          Page {pagination.page}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => performSearch(pagination.page + 1)}
                        disabled={pagination.page * 20 >= pagination.total || loading}
                        className="focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Next →
                      </Button>
                    </div>
                  </div>
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

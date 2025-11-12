'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardBody } from '@/components/ui/card'

interface Version {
  id: string
  noteId: string
  title: string
  content: string
  createdAt: string
}

export default function VersionsClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const noteId = searchParams.get('noteId')

  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        setLoading(true)
        if (!noteId) {
          setError('Please access version history from a note by clicking "View Version History"')
          setVersions([])
          setLoading(false)
          return
        }
        const response = await fetch(`/api/notes/${noteId}/versions`)

        if (!response.ok) throw new Error('Failed to fetch versions')
        const data = await response.json()
        setVersions(data.versions || [])
        setError('')
      } catch (err) {
        setError('Failed to load versions')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchVersions()
  }, [noteId])

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Version History</h1>
              <p className="mt-2 text-gray-600">
                View and restore previous versions of this note
              </p>
            </div>
            <Link href={noteId ? `/dashboard/notes/${noteId}` : '/dashboard'}>
              <Button variant="ghost">← Back</Button>
            </Link>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading versions...</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No versions available</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {versions.map((version, index) => (
                <Card key={version.id}>
                  <CardBody>
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            Version {versions.length - index}: {version.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Created: {new Date(version.createdAt).toLocaleString()}
                          </p>
                          <p className="text-gray-700 mt-3 line-clamp-3">
                            {version.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

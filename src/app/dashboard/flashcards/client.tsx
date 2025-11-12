'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardBody } from '@/components/ui/card'

interface Flashcard {
  id: string
  question: string
  answer: string
  difficulty: string
  noteId: string
  note?: { id: string; title: string }
}

export default function FlashcardsClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const noteId = searchParams.get('noteId')

  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchFlashcards = async () => {
      try {
        setLoading(true)
        const url = noteId
          ? `/api/notes/${noteId}/flashcards`
          : '/api/flashcards'

        const response = await fetch(url)

        if (!response.ok) throw new Error('Failed to fetch flashcards')
        const data = await response.json()
        setFlashcards(data.flashcards || [])
        setError('')
      } catch (err) {
        setError('Failed to load flashcards')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchFlashcards()
  }, [noteId])

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Flashcards</h1>
              <p className="mt-2 text-gray-600">
                {noteId ? 'Flashcards for this note' : 'All your flashcards'}
              </p>
            </div>
            <Link href={noteId ? `/dashboard/notes/${noteId}` : '/dashboard'}>
              <Button variant="ghost">← {noteId ? 'Back to Note' : 'Back to Dashboard'}</Button>
            </Link>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading flashcards...</p>
            </div>
          ) : flashcards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">
                {noteId ? 'No flashcards for this note' : 'No flashcards yet'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {flashcards.map((card) => (
                <Card key={card.id}>
                  <CardBody>
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            Q: {card.question}
                          </p>
                          <p className="text-gray-700 mt-2">A: {card.answer}</p>
                        </div>
                        <span className="px-3 py-1 text-sm rounded bg-blue-100 text-blue-700">
                          {card.difficulty}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        From note:{' '}
                        <Link
                          href={`/dashboard/notes/${card.noteId}`}
                          className="text-blue-600 hover:underline"
                        >
                          {card.note?.title || 'Untitled'}
                        </Link>
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

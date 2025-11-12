import { Suspense } from 'react'
import FlashcardsClient from './client'

export default function FlashcardsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-600">Loading...</p></div>}>
      <FlashcardsClient />
    </Suspense>
  )
}

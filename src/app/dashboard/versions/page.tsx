import { Suspense } from 'react'
import VersionsClient from './client'

export default function VersionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-600">Loading...</p></div>}>
      <VersionsClient />
    </Suspense>
  )
}

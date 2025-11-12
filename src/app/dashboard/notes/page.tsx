/**
 * FILE: src/app/dashboard/notes/page.tsx
 * PURPOSE: Server component wrapper for notes list page with Suspense boundary.
 * INPUTS: URL search params (handled by client component).
 * OUTPUTS: Wrapped NotesListClient component with fallback UI.
 * NOTES: Changed to server component with Suspense to satisfy Next.js 14 requirement
 *        for useSearchParams(). Client logic moved to client.tsx.
 *        Suspense boundary provides loading state while search params resolve.
 */

import { Suspense } from 'react'
import NotesListClient from './client'
import Navigation from '@/components/Navigation'

/**
 * Loading fallback for Suspense boundary.
 * Displayed while client component with useSearchParams is hydrating.
 * Includes Navigation component to ensure consistent UI during loading.
 */
function NotesListLoading() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading notes...</div>
      </div>
    </>
  )
}

/**
 * NotesListPage server component
 * Wraps client component in Suspense to handle useSearchParams() requirement.
 *
 * @security Auth checks performed in API routes, not here
 * @ux Suspense boundary prevents layout shift during param loading
 * @ux Navigation included in both loading fallback and client component for consistency
 */
export default function NotesListPage() {
  return (
    <Suspense fallback={<NotesListLoading />}>
      <NotesListClient />
    </Suspense>
  )
}

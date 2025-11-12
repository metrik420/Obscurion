/**
 * FILE: src/app/dashboard/search/page.tsx
 * PURPOSE: Server component wrapper for search page with Suspense boundary.
 * INPUTS: URL search params (handled by client component).
 * OUTPUTS: Wrapped SearchPageClient component with fallback UI.
 * NOTES: Changed to server component with Suspense to satisfy Next.js 14 requirement
 *        for useSearchParams(). Client logic moved to client.tsx.
 *        Suspense boundary provides loading state while search params resolve.
 */

import { Suspense } from 'react'
import SearchPageClient from './client'
import Navigation from '@/components/Navigation'

/**
 * Loading fallback for Suspense boundary.
 * Displayed while client component with useSearchParams is hydrating.
 * Includes Navigation component to ensure consistent UI during loading.
 */
function SearchPageLoading() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading search...</div>
      </div>
    </>
  )
}

/**
 * SearchPage server component
 * Wraps client component in Suspense to handle useSearchParams() requirement.
 *
 * @security Auth checks performed in API routes, not here
 * @ux Suspense boundary prevents layout shift during param loading
 * @ux Navigation included in both loading fallback and client component for consistency
 */
export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageLoading />}>
      <SearchPageClient />
    </Suspense>
  )
}

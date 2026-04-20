'use client'
import { useEffect } from 'react'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-8 max-w-md w-full">
        <p className="text-2xl mb-2">⚠️</p>
        <h2 className="text-lg font-semibold text-[var(--sg-text-1)] mb-2">Something went wrong</h2>
        <p className="text-sm text-[var(--sg-text-2)] mb-4">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-[var(--sg-sky)] text-[var(--sg-base)] rounded-lg text-sm font-semibold hover:brightness-110 transition-all"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

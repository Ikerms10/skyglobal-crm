'use client'
import { useEffect } from 'react'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-8 max-w-md w-full">
        <p className="text-2xl mb-2">⚠️</p>
        <h2 className="text-lg font-semibold text-white mb-2">Something went wrong</h2>
        <p className="text-sm text-[#9a9585] mb-4">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-[#3583b3] text-white rounded-lg text-sm hover:bg-[#2a6d96] transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

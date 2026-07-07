'use client'
import type { SearchResult } from '@/types'

interface Props {
  result: SearchResult
  onClick: () => void
}

export function ResultItem({ result, onClick }: Props) {
  return (
    <div className="py-4 border-b border-gray-100 last:border-b-0">
      <button
        onClick={onClick}
        className="text-left w-full group"
      >
        <p className="text-xs text-green-700 mb-0.5">{result.displayLink}</p>
        <h3 className="text-blue-700 group-hover:underline font-medium text-base leading-snug mb-1">
          {result.title}
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed">{result.snippet}</p>
      </button>
    </div>
  )
}

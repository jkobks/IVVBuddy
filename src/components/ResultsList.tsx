import { ResultItem } from './ResultItem'
import type { SearchResult } from '@/types'

interface Props {
  results: SearchResult[]
  onClickResult: (result: SearchResult) => void
}

export function ResultsList({ results, onClickResult }: Props) {
  if (results.length === 0) return null

  return (
    <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
      {results.map((result) => (
        <ResultItem
          key={result.url}
          result={result}
          onClick={() => onClickResult(result)}
        />
      ))}
    </div>
  )
}

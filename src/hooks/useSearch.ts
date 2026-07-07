'use client'
import { useState } from 'react'
import type { SearchResult } from '@/types'

export function useSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function executeSearch(q: string) {
    if (!q.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.details?.message ?? data?.error ?? `HTTP ${res.status}`)
      }
      setResults(data.results ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler bei der Suche')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  return { query, setQuery, results, isLoading, error, executeSearch }
}

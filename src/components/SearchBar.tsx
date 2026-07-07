'use client'

interface Props {
  query: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
}

export function SearchBar({ query, onChange, onSubmit, isLoading }: Props) {
  return (
    <form
      className="flex gap-2 mb-6"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <input
        type="search"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Suchbegriff eingeben…"
        disabled={isLoading}
        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {isLoading ? 'Suche…' : 'Suchen'}
      </button>
    </form>
  )
}

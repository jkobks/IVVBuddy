import { NextRequest } from 'next/server'

interface BraveWebResult {
  title: string
  url: string
  description: string
  meta_url: { hostname: string }
}

interface BraveResponse {
  web?: { results?: BraveWebResult[] }
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  if (!q?.trim()) {
    return Response.json({ error: 'Missing query' }, { status: 400 })
  }

  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Search not configured' }, { status: 503 })
  }

  const url =
    `https://api.search.brave.com/res/v1/web/search` +
    `?q=${encodeURIComponent(q)}&count=10`

  // Brave's Free plan caps at 1 req/sec across the whole API key (not per user) —
  // with several study participants searching concurrently, momentary 429s are
  // expected traffic, not a real failure. One retry after a beat clears them.
  const MAX_ATTEMPTS = 3
  let res: Response
  let attempt = 0
  try {
    while (true) {
      attempt++
      res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
        next: { revalidate: 0 },
      })

      if (res.status !== 429 || attempt >= MAX_ATTEMPTS) break
      await new Promise((resolve) => setTimeout(resolve, 1100 * attempt))
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[brave] status:', res.status, JSON.stringify(err))
      return Response.json({ error: 'Search API error', details: err, status: res.status }, { status: res.status })
    }

    const data: BraveResponse = await res.json()
    const items = data.web?.results ?? []
    const results = items.map((item, index) => ({
      title: item.title,
      url: item.url,
      snippet: item.description ?? '',
      displayLink: item.meta_url?.hostname ?? new URL(item.url).hostname,
      rank: index + 1,
    }))

    return Response.json({ results })
  } catch {
    return Response.json({ error: 'Search request failed' }, { status: 500 })
  }
}

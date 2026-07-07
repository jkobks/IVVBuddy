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

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
      next: { revalidate: 0 },
    })

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

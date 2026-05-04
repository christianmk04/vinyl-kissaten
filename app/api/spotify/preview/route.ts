// Recovers Spotify 30-second preview URLs that the public API stopped exposing
// in late 2024 by parsing them out of the publicly-rendered embed page HTML.
//
// /api/spotify/preview?id={trackId}  →  { url: string | null }
//
// Runs server-side because open.spotify.com does not send permissive CORS
// headers; a direct browser fetch would fail. Results are cached in-memory
// for an hour so repeat listens of the same album don't re-scrape.

import { NextRequest, NextResponse } from 'next/server'

type CacheEntry = { url: string | null; ts: number }
const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 1000 * 60 * 60  // 1 hour

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Multiple patterns covering different embed page builds. Spotify has shipped
// at least three distinct shapes for the inlined audio preview JSON since
// 2023; we try each in order.
const PREVIEW_PATTERNS: RegExp[] = [
  /"audioPreview"\s*:\s*\{\s*"url"\s*:\s*"([^"]+)"/,
  /"audioPreview"\s*:\s*\{\s*"format"\s*:\s*"[^"]+"\s*,\s*"url"\s*:\s*"([^"]+)"/,
  /"preview_url"\s*:\s*"([^"]+)"/,
  // Fallback — sometimes the preview is just a direct p.scdn.co URL inlined
  /"(https:\\u002F\\u002Fp\.scdn\.co\\u002Fmp3-preview\\u002F[^"]+)"/,
  /"(https:\/\/p\.scdn\.co\/mp3-preview\/[^"]+)"/,
]

function unescapeJsonUrl(s: string): string {
  return s.replace(/\\u002F/g, '/').replace(/\\\//g, '/')
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id || !/^[a-zA-Z0-9]+$/.test(id)) {
    return NextResponse.json({ error: 'missing or invalid id' }, { status: 400 })
  }

  const now = Date.now()
  const cached = cache.get(id)
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json({ url: cached.url, cached: true })
  }

  try {
    const res = await fetch(`https://open.spotify.com/embed/track/${id}`, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      // Don't carry cookies; Next.js fetch defaults are fine
      cache: 'no-store',
    })

    if (!res.ok) {
      cache.set(id, { url: null, ts: now })
      return NextResponse.json({ url: null, status: res.status })
    }

    const html = await res.text()

    let url: string | null = null
    for (const pattern of PREVIEW_PATTERNS) {
      const match = html.match(pattern)
      if (match && match[1]) {
        url = unescapeJsonUrl(match[1])
        // Sanity check: must be a Spotify CDN preview URL
        if (url.includes('p.scdn.co/mp3-preview/')) break
        url = null
      }
    }

    cache.set(id, { url, ts: now })
    return NextResponse.json({ url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ url: null, error: msg }, { status: 500 })
  }
}

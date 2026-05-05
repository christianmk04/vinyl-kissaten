#!/usr/bin/env node
// Snapshot the host's Spotify library to public/library.json so visitors can
// browse it in "guest mode" without needing a Spotify account or Premium.
//
// Pipeline:
//   1. Fetch all saved albums from /me/albums (paginated)
//   2. For each album, fetch the full track list from /albums/{id}
//   3. For each track, query Deezer's free /search API to grab a 30-second
//      preview MP3 URL (Spotify removed preview_url from the API in late 2024,
//      Deezer still serves them publicly with no auth)
//   4. Write one consolidated JSON blob to public/library.json
//
// Usage:
//   SPOTIFY_TOKEN=BQ...  node scripts/snapshot-library.mjs
//
// Where to get SPOTIFY_TOKEN:
//   1. Run `pnpm dev`, sign in with Spotify in the browser
//   2. Open devtools → Application → Local Storage → http://127.0.0.1:3000
//   3. Copy the value of `spotify_access_token`
//   4. Paste it as the env var above (good for ~1 hour)
//
// The output file is committed to the repo and shipped as a static asset, so
// the snapshot is the deployed app's library — refresh it when your real
// library meaningfully changes.

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const SPOTIFY_TOKEN = process.env.SPOTIFY_TOKEN
if (!SPOTIFY_TOKEN) {
  console.error(
    'Missing SPOTIFY_TOKEN env var.\n' +
      '  Sign in to the dev app, copy localStorage.spotify_access_token, then:\n' +
      '  SPOTIFY_TOKEN=... pnpm snapshot',
  )
  process.exit(1)
}

const OUT_PATH = join(process.cwd(), 'public', 'library.json')

// ─── Spotify ─────────────────────────────────────────────────────────────────

async function spotify(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${SPOTIFY_TOKEN}` },
  })
  if (res.status === 401) {
    throw new Error(
      'Spotify 401 — token expired. Refresh it from localStorage and retry.',
    )
  }
  if (!res.ok) {
    throw new Error(`Spotify ${res.status} ${res.statusText} on ${url}`)
  }
  return res.json()
}

async function fetchSavedAlbums() {
  const albums = []
  let url = 'https://api.spotify.com/v1/me/albums?limit=50'
  while (url) {
    const data = await spotify(url)
    for (const item of data.items) {
      albums.push(item.album)
    }
    url = data.next
  }
  return albums
}

async function fetchAlbumTracks(albumId) {
  const tracks = []
  let url = `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`
  while (url) {
    const data = await spotify(url)
    for (const t of data.items) tracks.push(t)
    url = data.next
  }
  return tracks
}

// ─── Deezer (free, no auth, returns 30s preview MP3 URLs) ────────────────────
//
// Deezer's search API treats query terms loosely; the most reliable shape is
// `track:"name" artist:"name"`. We also fall back to a plain query if the
// strict form returns nothing — non-Latin titles and accented characters
// sometimes confuse the indexed form.

async function deezerLookup(track, artist) {
  const tries = [
    `track:"${track}" artist:"${artist}"`,
    `${track} ${artist}`,
  ]
  for (const q of tries) {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=5`
    let res
    try {
      res = await fetch(url)
    } catch (e) {
      console.warn(`  ! Deezer fetch failed: ${e.message}`)
      return null
    }
    if (!res.ok) continue
    const data = await res.json()
    if (!data?.data?.length) continue

    // Pick the best match: prefer the one whose track name is closest and
    // whose artist matches case-insensitively. Otherwise take the first.
    const wantTrack = norm(track)
    const wantArtist = norm(artist)
    let best = null
    let bestScore = -1
    for (const hit of data.data) {
      if (!hit.preview) continue
      const hitTrack = norm(hit.title ?? '')
      const hitArtist = norm(hit.artist?.name ?? '')
      let score = 0
      if (hitArtist === wantArtist) score += 3
      else if (hitArtist.includes(wantArtist) || wantArtist.includes(hitArtist)) score += 1
      if (hitTrack === wantTrack) score += 3
      else if (hitTrack.includes(wantTrack) || wantTrack.includes(hitTrack)) score += 1
      if (score > bestScore) {
        best = hit
        bestScore = score
      }
    }
    if (best?.preview) return best.preview
  }
  return null
}

function norm(s) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/\(.*?\)|\[.*?\]/g, '') // strip parenthetical / bracketed bits
    .replace(/\s+-\s+.*$/, '') // strip "remastered/remix" suffixes after a dash
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Concurrency helpers ─────────────────────────────────────────────────────

async function pool(items, concurrency, fn) {
  const out = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = cursor++
      if (i >= items.length) return
      out[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return out
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('▸ Fetching saved albums...')
  const rawAlbums = await fetchSavedAlbums()
  console.log(`  ${rawAlbums.length} albums`)

  console.log('▸ Fetching track lists (concurrency 4)...')
  const albumsWithTracks = await pool(rawAlbums, 4, async (album, i) => {
    process.stdout.write(`\r  ${i + 1}/${rawAlbums.length}  ${album.name.padEnd(40).slice(0, 40)} `)
    const tracks = await fetchAlbumTracks(album.id)
    return { album, tracks }
  })
  process.stdout.write('\n')

  // Flatten to (album, track) pairs for Deezer resolution
  const allTracks = []
  for (const { album, tracks } of albumsWithTracks) {
    for (const t of tracks) {
      allTracks.push({ album, track: t })
    }
  }

  console.log(`▸ Resolving previews from Deezer (${allTracks.length} tracks, concurrency 6)...`)
  let resolved = 0
  let missed = 0
  const previewMap = new Map()
  await pool(allTracks, 6, async ({ album, track }, i) => {
    const artist = track.artists?.[0]?.name ?? album.artists?.[0]?.name ?? ''
    const url = await deezerLookup(track.name, artist)
    if (url) {
      previewMap.set(track.id, url)
      resolved++
    } else {
      missed++
    }
    if ((i + 1) % 25 === 0 || i === allTracks.length - 1) {
      process.stdout.write(`\r  ${i + 1}/${allTracks.length}  hits=${resolved} miss=${missed}  `)
    }
  })
  process.stdout.write('\n')

  // ─── Build snapshot ────────────────────────────────────────────────────────

  const snapshot = {
    generatedAt: new Date().toISOString(),
    counts: {
      albums: albumsWithTracks.length,
      tracks: allTracks.length,
      previewsResolved: resolved,
      previewsMissed: missed,
    },
    albums: albumsWithTracks.map(({ album, tracks }) => ({
      id: album.id,
      uri: album.uri,
      name: album.name,
      artists: album.artists.map((a) => ({ id: a.id, name: a.name })),
      images: album.images.map((img) => ({
        url: img.url,
        width: img.width,
        height: img.height,
      })),
      genres: album.genres ?? [],
      total_tracks: album.total_tracks,
      release_date: album.release_date,
      tracks: tracks.map((t) => ({
        id: t.id,
        uri: t.uri,
        name: t.name,
        duration_ms: t.duration_ms,
        disc_number: t.disc_number ?? 1,
        track_number: t.track_number,
        artists: t.artists.map((a) => ({ id: a.id, name: a.name })),
        preview_url: previewMap.get(t.id) ?? null,
      })),
    })),
  }

  await mkdir(join(process.cwd(), 'public'), { recursive: true })
  await writeFile(OUT_PATH, JSON.stringify(snapshot, null, 2))

  const sizeKb = (JSON.stringify(snapshot).length / 1024).toFixed(1)
  console.log(`\n✓ Wrote ${OUT_PATH} (${sizeKb} KB)`)
  console.log(
    `  ${snapshot.counts.albums} albums · ${snapshot.counts.tracks} tracks · ` +
      `${resolved} previews (${((resolved / allTracks.length) * 100).toFixed(0)}%)`,
  )
  if (missed > 0) {
    console.log(
      `  ${missed} tracks have no preview — those will appear in the library ` +
        `but won't make a sound when the needle drops.`,
    )
  }
}

main().catch((e) => {
  console.error('\n✗ Snapshot failed:', e.message)
  process.exit(1)
})

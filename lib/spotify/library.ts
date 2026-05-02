import type { SpotifyAlbum, SpotifyTrack } from '@/lib/types'

async function spotifyFetch<T>(
  url: string,
  token: string,
): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`)
  return res.json() as Promise<T>
}

export async function fetchSavedAlbums(token: string): Promise<SpotifyAlbum[]> {
  const albums: SpotifyAlbum[] = []
  let url: string | null =
    'https://api.spotify.com/v1/me/albums?limit=50'

  while (url) {
    type AlbumsPage = { items: Array<{ album: SpotifyAlbum }>; next: string | null }
    const data: AlbumsPage = await spotifyFetch<AlbumsPage>(url, token)

    for (const item of data.items) {
      albums.push(item.album)
    }
    url = data.next
  }

  return albums
}

export async function fetchAlbumTracks(
  albumId: string,
  token: string,
): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<{
    tracks: { items: SpotifyTrack[] }
  }>(`https://api.spotify.com/v1/albums/${albumId}`, token)
  return data.tracks.items
}

export async function fetchUserProfile(
  token: string,
): Promise<{ product: string; display_name: string }> {
  return spotifyFetch('https://api.spotify.com/v1/me', token)
}

// Groups albums into shelf categories.
// Tries to use the first genre; falls back to chunks of 20.
export function categorizeAlbums(
  albums: SpotifyAlbum[],
): Record<string, SpotifyAlbum[]> {
  const categories: Record<string, SpotifyAlbum[]> = {}

  for (const album of albums) {
    const genre = album.genres?.[0] ?? null
    const key = genre ?? 'Various'
    if (!categories[key]) categories[key] = []
    categories[key].push(album)
  }

  // If everything fell into "Various" (no genre data), chunk it
  if (Object.keys(categories).length === 1 && categories['Various']) {
    const all = categories['Various']
    const chunked: Record<string, SpotifyAlbum[]> = {}
    const CHUNK = 20
    for (let i = 0; i < all.length; i += CHUNK) {
      const shelf = String.fromCharCode(65 + Math.floor(i / CHUNK)) // A, B, C...
      chunked[`Shelf ${shelf}`] = all.slice(i, i + CHUNK)
    }
    return chunked
  }

  return categories
}

// Downsamples album art to 128×128 using canvas nearest-neighbor scaling.
// Returns a data URL or the original URL on failure.
export async function downsampleArtwork(imageUrl: string): Promise<string> {
  if (typeof window === 'undefined') return imageUrl
  try {
    const img = await loadImage(imageUrl)
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(img, 0, 0, 128, 128)
    return canvas.toDataURL('image/png')
  } catch {
    return imageUrl
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

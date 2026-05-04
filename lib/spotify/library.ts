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

// Downsamples album art to 512×512 and pre-processes it to look right under the
// kissaten's warm lighting: lower saturation + slight darkening so colors don't
// blow out when the lambert lights add their tint on top.
export async function downsampleArtwork(imageUrl: string): Promise<string> {
  if (typeof window === 'undefined') return imageUrl
  try {
    const img = await loadImage(imageUrl)
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(img, 0, 0, 512, 512)

    // Album art is rendered with MeshBasicMaterial (no lighting), so the
    // texture is exactly what shows on screen. Pull saturation way down and
    // soften contrast around the midpoint so the covers read as muted/vintage
    // rather than glowing under the cafe pendants.
    const SATURATION = 0.35   // 0=grayscale, 1=untouched
    const CONTRAST = 0.72     // <1 = pull values toward 128 grey
    const data = ctx.getImageData(0, 0, 512, 512)
    const px = data.data
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], g = px[i + 1], b = px[i + 2]
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      // Desaturate
      let r1 = lum + (r - lum) * SATURATION
      let g1 = lum + (g - lum) * SATURATION
      let b1 = lum + (b - lum) * SATURATION
      // Reduce contrast (pull toward middle grey)
      r1 = 128 + (r1 - 128) * CONTRAST
      g1 = 128 + (g1 - 128) * CONTRAST
      b1 = 128 + (b1 - 128) * CONTRAST
      px[i]     = Math.max(0, Math.min(255, Math.round(r1)))
      px[i + 1] = Math.max(0, Math.min(255, Math.round(g1)))
      px[i + 2] = Math.max(0, Math.min(255, Math.round(b1)))
    }
    ctx.putImageData(data, 0, 0)

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

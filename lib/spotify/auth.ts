'use client'

// We only need user-library-read now — playback runs through 30-sec
// previews via Web Audio, so the Web Playback SDK and the playback-state
// / streaming scopes that powered it are no longer requested. This also
// lets users sign in with a free Spotify account (no Premium needed).
const SCOPES = ['user-library-read'].join(' ')

function generateRandomString(length: number): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => chars[b % chars.length]).join('')
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  return crypto.subtle.digest('SHA-256', data)
}

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let str = ''
  bytes.forEach((b) => (str += String.fromCharCode(b)))
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function generateCodeVerifier(): Promise<string> {
  return generateRandomString(128)
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const hashed = await sha256(verifier)
  return base64urlEncode(hashed)
}

export async function buildAuthUrl(): Promise<string> {
  const verifier = await generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)

  sessionStorage.setItem('spotify_code_verifier', verifier)

  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI!,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES,
  })

  return `https://accounts.spotify.com/authorize?${params.toString()}`
}

export async function exchangeCode(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const verifier = sessionStorage.getItem('spotify_code_verifier')
  if (!verifier) throw new Error('No code verifier in session storage')

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI!,
    client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
    code_verifier: verifier,
  })

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token exchange failed: ${err}`)
  }

  sessionStorage.removeItem('spotify_code_verifier')
  return res.json()
}

export async function refreshToken(refreshTok: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshTok,
    client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
  })

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) throw new Error('Token refresh failed')
  return res.json()
}

// Token storage in localStorage (access + refresh + expiry)
export function saveTokens(data: {
  access_token: string
  refresh_token?: string
  expires_in: number
}) {
  localStorage.setItem('spotify_access_token', data.access_token)
  if (data.refresh_token) {
    localStorage.setItem('spotify_refresh_token', data.refresh_token)
  }
  localStorage.setItem(
    'spotify_expires_at',
    String(Date.now() + data.expires_in * 1000),
  )
}

export function loadTokens(): {
  accessToken: string | null
  refreshToken: string | null
  expiresAt: number | null
} {
  return {
    accessToken: localStorage.getItem('spotify_access_token'),
    refreshToken: localStorage.getItem('spotify_refresh_token'),
    expiresAt: Number(localStorage.getItem('spotify_expires_at')) || null,
  }
}

export function clearTokens() {
  localStorage.removeItem('spotify_access_token')
  localStorage.removeItem('spotify_refresh_token')
  localStorage.removeItem('spotify_expires_at')
}

export function isTokenExpired(expiresAt: number | null): boolean {
  if (!expiresAt) return true
  return Date.now() > expiresAt - 5 * 60 * 1000 // refresh 5 min early
}

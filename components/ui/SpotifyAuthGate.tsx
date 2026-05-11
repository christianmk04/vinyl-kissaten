'use client'

import { useEffect, useState } from 'react'
import { buildAuthUrl, exchangeCode, saveTokens, loadTokens, isTokenExpired, refreshToken } from '@/lib/spotify/auth'
import { useGameStore } from '@/lib/game/store'

export default function SpotifyAuthGate() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Whether public/library.json exists. If yes, expose a guest entry so
  // visitors who don't (or can't) sign in with Spotify still get the cafe.
  // We probe with a HEAD request so we don't waste bandwidth on the snapshot
  // file itself unless the user actually clicks the guest button.
  const [snapshotAvailable, setSnapshotAvailable] = useState<boolean | null>(null)
  const spotifyToken = useGameStore((s) => s.spotifyToken)
  const guestMode = useGameStore((s) => s.guestMode)
  const setSpotifyToken = useGameStore((s) => s.setSpotifyToken)
  const setGuestMode = useGameStore((s) => s.setGuestMode)

  useEffect(() => {
    // Handle OAuth callback code in URL
    const params = new URLSearchParams(window.location.search)
    const code = params.get('spotify_code')
    const err = params.get('spotify_error')

    if (err) {
      setError(`Spotify error: ${err}`)
      window.history.replaceState({}, '', '/')
      return
    }

    if (code) {
      window.history.replaceState({}, '', '/')
      setLoading(true)
      exchangeCode(code)
        .then((data) => {
          saveTokens(data)
          setSpotifyToken(data.access_token)
        })
        .catch((e) => setError(String(e)))
        .finally(() => setLoading(false))
      return
    }

    // Try loading saved tokens
    const { accessToken, refreshToken: rt, expiresAt } = loadTokens()
    if (accessToken && !isTokenExpired(expiresAt)) {
      setSpotifyToken(accessToken)
    } else if (rt) {
      // Refresh
      setLoading(true)
      refreshToken(rt)
        .then((data) => {
          saveTokens(data)
          setSpotifyToken(data.access_token)
        })
        .catch(() => setError('Session expired. Please sign in again.'))
        .finally(() => setLoading(false))
    }
  }, [])

  // Probe for the static library snapshot once on mount. This is cheap (a
  // single HEAD request) and lets us hide the guest button on instances that
  // haven't been snapshotted yet rather than letting users click it and hit
  // a 404.
  useEffect(() => {
    let cancelled = false
    fetch('/library.json', { method: 'HEAD' })
      .then((res) => {
        if (!cancelled) setSnapshotAvailable(res.ok)
      })
      .catch(() => {
        if (!cancelled) setSnapshotAvailable(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (spotifyToken || guestMode) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 8, 6, 0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        fontFamily: 'Courier New, monospace',
      }}
    >
      <div
        style={{
          background: '#2a1810',
          border: '1px solid #5a3828',
          padding: '2rem 2.5rem',
          maxWidth: '360px',
          width: '90%',
          textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              fontSize: '28px',
              letterSpacing: '0.1em',
              color: '#e8d5a8',
              marginBottom: '0.5rem',
            }}
          >
            ▶ VINYL KISSATEN
          </div>
          <div style={{ fontSize: '11px', color: '#8a7060', letterSpacing: '0.15em' }}>
            A TOKYO JAZZ LISTENING CAFÉ
          </div>
        </div>

        <div
          style={{
            fontSize: '12px',
            color: '#a08870',
            marginBottom: '1.25rem',
            lineHeight: 1.6,
          }}
        >
          Sign in with Spotify to browse your vinyl library and drop the needle.
          <br />
          <br />
          <span style={{ color: '#6a5848', fontSize: '10px' }}>
            Playback uses 30-second previews — works on any Spotify account,
            free or Premium.
          </span>
        </div>

        {/* Invite-only beta notice — Spotify apps start in Development Mode
            with a 25-user allowlist until "Extended Quota" is approved. This
            warns visitors so they don't think the app is broken when Spotify
            shows them an "app not approved" error after authorizing. */}
        <div
          style={{
            fontSize: '10px',
            color: '#8a6a40',
            background: '#1a0f06',
            border: '1px solid #3a2410',
            borderLeft: '3px solid #cc8833',
            padding: '8px 12px',
            marginBottom: '1.5rem',
            lineHeight: 1.5,
            textAlign: 'left',
          }}
        >
          <strong style={{ color: '#cc8833' }}>Invite-only beta.</strong>{' '}
          This kissaten is currently open to a small group of testers. If you
          see an &quot;app not approved&quot; page after signing in, message
          the host with your Spotify email to be added to the allowlist.
        </div>

        {error && (
          <div
            style={{
              fontSize: '11px',
              color: '#cc4444',
              marginBottom: '1rem',
              padding: '0.5rem',
              background: '#1a0808',
              border: '1px solid #441010',
            }}
          >
            {error}
          </div>
        )}

        <button
          disabled={loading}
          onClick={async () => {
            setLoading(true)
            try {
              const url = await buildAuthUrl()
              window.location.href = url
            } catch (e) {
              setError(String(e))
              setLoading(false)
            }
          }}
          style={{
            background: loading ? '#5a4020' : '#ffb56b',
            color: '#1a0a00',
            border: 'none',
            padding: '0.75rem 2rem',
            fontSize: '12px',
            fontFamily: 'Courier New, monospace',
            letterSpacing: '0.15em',
            cursor: loading ? 'default' : 'pointer',
            width: '100%',
            fontWeight: 'bold',
          }}
        >
          {loading ? 'CONNECTING...' : 'SIGN IN WITH SPOTIFY'}
        </button>

        {snapshotAvailable && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '1rem 0 0.75rem',
                color: '#5a4838',
                fontSize: '9px',
                letterSpacing: '0.2em',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: '#3a2a1a' }} />
              OR
              <div style={{ flex: 1, height: '1px', background: '#3a2a1a' }} />
            </div>

            <button
              disabled={loading}
              onClick={() => {
                // Guest path: skip Spotify entirely. The library loader will
                // pull from /library.json and previewPlayer will use the
                // baked Deezer preview URLs.
                setGuestMode(true)
              }}
              style={{
                background: 'transparent',
                color: '#cc8833',
                border: '1px solid #5a3828',
                padding: '0.6rem 2rem',
                fontSize: '11px',
                fontFamily: 'Courier New, monospace',
                letterSpacing: '0.15em',
                cursor: loading ? 'default' : 'pointer',
                width: '100%',
              }}
            >
              ENTER AS GUEST
            </button>
            <div
              style={{
                fontSize: '9px',
                color: '#5a4838',
                marginTop: '0.5rem',
                lineHeight: 1.5,
              }}
            >
              Browse the host&apos;s record collection · 30-second previews · no account needed
            </div>
          </>
        )}

        <div style={{ fontSize: '9px', color: '#4a3828', marginTop: '1.5rem' }}>
          Desktop: WASD + Mouse · E to interact · F to flip record
          <br />
          Mobile: Joystick + Drag to look · Tap to interact
        </div>
      </div>
    </div>
  )
}

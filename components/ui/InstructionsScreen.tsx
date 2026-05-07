'use client'

import { useEffect, useState } from 'react'
import { useGameStore } from '@/lib/game/store'

interface InstructionsScreenProps {
  onDismiss: () => void
}

const isMobileViewport = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || window.innerWidth < 768)

export default function InstructionsScreen({ onDismiss }: InstructionsScreenProps) {
  const albums = useGameStore((s) => s.albums)
  const libraryError = useGameStore((s) => s.libraryError)
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    setMobile(isMobileViewport())
  }, [])

  // Press Enter / Space to dismiss
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onDismiss()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDismiss])

  const hasNoAlbums = albums.length === 0

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 8, 6, 0.94)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 180,
        fontFamily: 'Courier New, monospace',
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          background: '#1f1410',
          border: '1px solid #5a3828',
          padding: '28px 32px',
          maxWidth: '520px',
          width: '100%',
          boxShadow: '0 0 80px rgba(255, 181, 107, 0.08)',
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '28px', color: '#ffb56b', letterSpacing: '0.2em' }}>
            喫茶
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#a08870',
              letterSpacing: '0.2em',
              marginTop: '6px',
            }}
          >
            WELCOME TO THE KISSATEN
          </div>
        </div>

        {/* Library status — show error or empty-library guidance prominently */}
        {libraryError && (
          <Notice tone="error" title="Couldn't load your library">
            {libraryError}
            <br />
            <span style={{ opacity: 0.75 }}>
              Try refreshing the page. If this keeps happening, sign out and back in.
            </span>
          </Notice>
        )}

        {hasNoAlbums && !libraryError && (
          <Notice tone="warn" title="No albums found">
            Your Spotify library is empty. Open Spotify, save some albums to <em>Your Library</em>,
            then refresh this page — they&apos;ll appear on the shelves automatically.
          </Notice>
        )}

        {/* Headphones recommendation */}
        <Notice tone="info" title="🎧 Headphones recommended">
          The cafe has rain on the window, vinyl crackle, and tonearm wow & flutter.
          A decent pair of headphones makes all of it audible.
        </Notice>

        {/* Controls */}
        <Section title={mobile ? 'CONTROLS — MOBILE' : 'CONTROLS — DESKTOP'}>
          {mobile ? (
            <>
              <Row k="Joystick (left)" v="Walk around" />
              <Row k="Drag screen" v="Look around" />
              <Row k="Tap on a thing" v="Interact (pick up, set down, open turntable)" />
              <Row k="ACT button" v="Same as a tap, aimed at the screen center" />
              <Row k="Two-finger tap" v="Toggle now-playing panel" />
              <Row k="▲ / ▼ near shelf" v="Browse to other shelf pages" />
            </>
          ) : (
            <>
              <Row k="WASD / arrows" v="Walk around" />
              <Row k="Click + drag" v="Look around" />
              <Row k="E or Enter" v="Interact (pick up record, open turntable)" />
              <Row k="F" v="Flip the record (Side A ↔ B)" />
              <Row k="[ / ]" v="Previous / next track" />
              <Row k="PgUp / PgDn" v="Browse shelf pages (when near shelf)" />
              <Row k="Tab" v="Toggle now-playing panel" />
              <Row k="Esc" v="Drop the held record / leave turntable" />
            </>
          )}
        </Section>

        {/* How to play */}
        <Section title="HOW IT WORKS">
          {mobile ? (
            <>
              <Bullet>
                Use the <strong style={{ color: '#e8d5a8' }}>joystick</strong> to walk over to the
                shelves. <strong style={{ color: '#e8d5a8' }}>Drag</strong> the screen to look
                around.
              </Bullet>
              <Bullet>
                <strong style={{ color: '#e8d5a8' }}>Tap an album</strong> to pick it up.
                Carry it to the turntable.
              </Bullet>
              <Bullet>
                <strong style={{ color: '#e8d5a8' }}>Tap the turntable</strong> to open the
                top-down view, then tap <strong style={{ color: '#e8d5a8' }}>ACT</strong> to
                cue → play → rest.
              </Bullet>
              <Bullet>
                To put a record back, look at its empty slot on the shelf and tap.
              </Bullet>
              <Bullet>
                Run out of room on a shelf? Walk up close — the{' '}
                <strong style={{ color: '#e8d5a8' }}>▲ / ▼</strong> arrows appear at the top
                of the screen so you can flip to the next set of records.
              </Bullet>
            </>
          ) : (
            <>
              <Bullet>Walk to the shelves, point at an album, and pick it up.</Bullet>
              <Bullet>Carry it to the turntable and interact with the deck.</Bullet>
              <Bullet>
                On the deck: <strong style={{ color: '#e8d5a8' }}>Enter</strong> to drop the needle,{' '}
                <strong style={{ color: '#e8d5a8' }}>F</strong> to flip,{' '}
                <strong style={{ color: '#e8d5a8' }}>G</strong> to take the record off.
              </Bullet>
              <Bullet>
                To put a record back, point at its empty slot on the shelf and press{' '}
                <strong style={{ color: '#e8d5a8' }}>E</strong>.
              </Bullet>
            </>
          )}
        </Section>

        {/* Playback modes */}
        <Section title="LISTEN VS. VINYL MODE">
          <Bullet>
            <strong style={{ color: '#e8d5a8' }}>Vinyl mode</strong> — 30-second previews with the
            full FX chain (warmth, RPM, wow & flutter). Works on any account.
          </Bullet>
          <Bullet>
            <strong style={{ color: '#e8d5a8' }}>Listen mode</strong> — full tracks via Spotify.
            Requires <strong>Spotify Premium</strong> and no FX (the audio stream is DRM-protected).
          </Bullet>
          <Bullet>
            Toggle <strong>LISTEN</strong> / <strong>VINYL</strong> from the
            turntable panel in the bottom-right.
          </Bullet>
        </Section>

        {/* Tip */}
        <div
          style={{
            fontSize: '10px',
            color: '#6a5040',
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid #2a1810',
            lineHeight: 1.5,
            textAlign: 'center',
          }}
        >
          Pro tip: walk over to the window. The street feels different at night.
        </div>

        {/* Begin button */}
        <button
          onClick={onDismiss}
          style={{
            background: '#ffb56b',
            color: '#1a0a00',
            border: 'none',
            padding: '12px 24px',
            fontSize: '12px',
            fontFamily: 'Courier New, monospace',
            letterSpacing: '0.2em',
            cursor: 'pointer',
            width: '100%',
            fontWeight: 'bold',
            marginTop: '20px',
          }}
        >
          ENTER THE KISSATEN
        </button>
        {!mobile && (
          <div
            style={{
              fontSize: '9px',
              color: '#4a3828',
              marginTop: '8px',
              textAlign: 'center',
              letterSpacing: '0.1em',
            }}
          >
            (or press Enter)
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tiny presentational helpers ──────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div
        style={{
          fontSize: '10px',
          color: '#cc8833',
          letterSpacing: '0.2em',
          marginBottom: '6px',
          fontWeight: 'bold',
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: '11px', color: '#a08870', lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '3px',
        fontSize: '11px',
      }}
    >
      <span
        style={{
          color: '#e8d5a8',
          minWidth: '110px',
          flexShrink: 0,
        }}
      >
        {k}
      </span>
      <span style={{ color: '#8a7060' }}>{v}</span>
    </div>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '4px', display: 'flex', gap: '8px' }}>
      <span style={{ color: '#cc8833', flexShrink: 0 }}>·</span>
      <span>{children}</span>
    </div>
  )
}

function Notice({
  tone,
  title,
  children,
}: {
  tone: 'info' | 'warn' | 'error'
  title: string
  children: React.ReactNode
}) {
  const palette = {
    info: { border: '#3a2a1a', bg: '#1a1410', accent: '#ffb56b' },
    warn: { border: '#5a4218', bg: '#2a1c0a', accent: '#ffcc55' },
    error: { border: '#5a2818', bg: '#2a1010', accent: '#ff7060' },
  }[tone]
  return (
    <div
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderLeft: `3px solid ${palette.accent}`,
        padding: '10px 14px',
        marginBottom: '14px',
        fontSize: '11px',
        color: '#b89878',
        lineHeight: 1.55,
      }}
    >
      <div
        style={{
          color: palette.accent,
          fontSize: '11px',
          fontWeight: 'bold',
          marginBottom: '4px',
          letterSpacing: '0.05em',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '@/lib/game/store'

// Each step is gated on a real loading milestone, so the screen stays put
// until the library is actually ready. The flavor text is just decoration —
// the heavy lifting is the artwork-downsample pass driven by useLibraryLoader.
type Step = {
  label: string
  // Predicate checked against the current library load state. When true,
  // we are at-or-past this step.
  reached: (state: {
    spotifyToken: string | null
    libraryLoadState: 'pending' | 'fetching' | 'processing' | 'done' | 'error'
    libraryProgress: { loaded: number; total: number }
  }) => boolean
}

const STEPS: Step[] = [
  {
    label: 'Closing the blinds...',
    reached: () => true, // always reached on mount
  },
  {
    label: 'Tuning the amp...',
    reached: (s) => !!s.spotifyToken,
  },
  {
    label: 'Letting the rain in...',
    reached: (s) =>
      s.libraryLoadState === 'fetching' ||
      s.libraryLoadState === 'processing' ||
      s.libraryLoadState === 'done',
  },
  {
    label: 'Stacking the crates...',
    reached: (s) =>
      s.libraryLoadState === 'processing' || s.libraryLoadState === 'done',
  },
  {
    label: 'Setting the needle...',
    reached: (s) => s.libraryLoadState === 'done',
  },
]

interface LoadingScreenProps {
  onComplete?: () => void
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const spotifyToken = useGameStore((s) => s.spotifyToken)
  const libraryLoadState = useGameStore((s) => s.libraryLoadState)
  const libraryProgress = useGameStore((s) => s.libraryProgress)

  const [visible, setVisible] = useState(true)
  const completedRef = useRef(false)

  // Compute the highest reached step from real state
  const stepIdx = (() => {
    let i = 0
    for (let k = 0; k < STEPS.length; k++) {
      if (STEPS[k].reached({ spotifyToken, libraryLoadState, libraryProgress })) i = k
    }
    return i
  })()

  // Once everything's done, give the final step a brief beat to read,
  // then dismiss. Guarded so we only fire onComplete once.
  useEffect(() => {
    if (libraryLoadState !== 'done' || completedRef.current) return
    completedRef.current = true
    const t = setTimeout(() => {
      setVisible(false)
      onComplete?.()
    }, 600)
    return () => clearTimeout(t)
  }, [libraryLoadState, onComplete])

  if (!visible) return null

  // Single progress source of truth:
  //   - Before processing starts: scale by step index so the bar still moves
  //     a little during the brief fetch / setup phases.
  //   - During processing: scale by actual album-load count (the long part).
  //   - When done: full bar, ready to dismiss.
  const isProcessing = libraryLoadState === 'processing'
  const hasProgress = isProcessing && libraryProgress.total > 0
  const progressFrac =
    libraryLoadState === 'done'
      ? 1
      : hasProgress
        ? libraryProgress.loaded / libraryProgress.total
        : (stepIdx + 1) / STEPS.length

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#1a1410',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        zIndex: 200,
        fontFamily: 'Courier New, monospace',
        gap: '16px',
      }}
    >
      <div style={{ fontSize: '28px', color: '#ffb56b', letterSpacing: '0.2em' }}>
        喫茶
      </div>
      <div
        style={{
          fontSize: '12px',
          color: '#7a6050',
          letterSpacing: '0.15em',
          minWidth: '260px',
          textAlign: 'center',
        }}
      >
        {STEPS[stepIdx].label}
      </div>

      {/* Per-album progress — only visible during the heavy processing step,
          where real time depends on the user's library size */}
      {hasProgress && (
        <div
          style={{
            fontSize: '10px',
            color: '#5a4030',
            letterSpacing: '0.1em',
            minWidth: '260px',
            textAlign: 'center',
          }}
        >
          {libraryProgress.loaded} / {libraryProgress.total} albums
        </div>
      )}

      {/* Single progress bar — drives off real album load when processing,
          step index otherwise */}
      <div
        style={{
          width: '220px',
          height: '2px',
          background: '#2a1810',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${progressFrac * 100}%`,
            background: '#ffb56b',
            transition: hasProgress ? 'width 120ms linear' : 'width 250ms ease',
          }}
        />
      </div>
    </div>
  )
}

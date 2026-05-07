'use client'

import { useGameStore } from '@/lib/game/store'

// Two-segment tab pill that switches between the deck-controls panel and the
// tracklist/now-playing panel on mobile when the player is at the turntable.
// Both panels exist regardless of platform — desktop just shows them
// simultaneously (controls top-right, now-playing bottom-left). Mobile has
// nowhere near enough screen for both, so this tab gates which one is
// visible at a time.
//
// Lives at the very top-right of the screen above where each panel anchors,
// so the panel slides in directly underneath without any layout jump.
export default function MobileTurntableTabs() {
  const view = useGameStore((s) => s.view)
  const tab = useGameStore((s) => s.mobileTurntableTab)
  const setTab = useGameStore((s) => s.setMobileTurntableTab)

  const isTouch =
    typeof window !== 'undefined' && 'ontouchstart' in window
  if (!isTouch || view !== 'turntable-top-down') return null

  const baseBtn: React.CSSProperties = {
    flex: 1,
    background: 'transparent',
    color: '#7a5030',
    border: 'none',
    padding: '8px 12px',
    fontFamily: 'Courier New, monospace',
    fontSize: '10px',
    letterSpacing: '0.12em',
    cursor: 'pointer',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
  }
  const activeBtn: React.CSSProperties = {
    ...baseBtn,
    background: '#ffb56b',
    color: '#1a0800',
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        width: '180px',
        display: 'flex',
        background: 'rgba(8, 6, 4, 0.92)',
        border: '1px solid #2a1810',
        zIndex: 51,
      }}
    >
      <button
        onClick={() => setTab('deck')}
        style={tab === 'deck' ? activeBtn : baseBtn}
      >
        DECK
      </button>
      <div style={{ width: 1, background: '#2a1810' }} />
      <button
        onClick={() => setTab('tracks')}
        style={tab === 'tracks' ? activeBtn : baseBtn}
      >
        TRACKS
      </button>
    </div>
  )
}

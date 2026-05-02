'use client'

import { useEffect, useState } from 'react'

const LOADING_STEPS = [
  'Closing the blinds...',
  'Tuning the amp...',
  'Letting the rain in...',
  'Stacking the crates...',
  'Setting the needle...',
]

interface LoadingScreenProps {
  onComplete?: () => void
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [stepIdx, setStepIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx((i) => {
        const next = i + 1
        if (next >= LOADING_STEPS.length) {
          clearInterval(interval)
          setTimeout(() => {
            setVisible(false)
            onComplete?.()
          }, 600)
        }
        return Math.min(next, LOADING_STEPS.length - 1)
      })
    }, 700)
    return () => clearInterval(interval)
  }, [onComplete])

  if (!visible) return null

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
          minWidth: '240px',
          textAlign: 'center',
        }}
      >
        {LOADING_STEPS[stepIdx]}
      </div>
      <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
        {LOADING_STEPS.map((_, i) => (
          <div
            key={i}
            style={{
              width: '8px',
              height: '3px',
              background: i <= stepIdx ? '#ffb56b' : '#2a1810',
            }}
          />
        ))}
      </div>
    </div>
  )
}

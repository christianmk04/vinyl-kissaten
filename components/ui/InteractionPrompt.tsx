'use client'

interface InteractionPromptProps {
  label: string | null
}

export default function InteractionPrompt({ label }: InteractionPromptProps) {
  if (!label) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, calc(-50% + 60px))',
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        letterSpacing: '0.12em',
        color: '#e8d5a8',
        background: 'rgba(10, 8, 6, 0.7)',
        padding: '6px 12px',
        border: '1px solid #3a2818',
        zIndex: 50,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </div>
  )
}

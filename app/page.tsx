'use client'

import dynamic from 'next/dynamic'

const Cafe = dynamic(() => import('@/components/cafe/Cafe'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#1a1410',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#e8d5a8',
        fontFamily: 'Courier New, monospace',
        fontSize: '14px',
        letterSpacing: '0.1em',
      }}
    >
      Closing the blinds...
    </div>
  ),
})

export default function Home() {
  return <Cafe />
}

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vinyl Kissaten',
  description: 'A Tokyo jazz listening café — browse vinyl, drop the needle.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

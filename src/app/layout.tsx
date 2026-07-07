import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Suchstudie',
  description: 'Empirische Suchstudie',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body className="antialiased">{children}</body>
    </html>
  )
}

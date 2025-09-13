import type { Metadata } from 'next'
import { Spline_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const splineSans = Spline_Sans({
  subsets: ['latin'],
  variable: '--font-spline-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AppLauncher App',
  description: 'Created with AppLauncher.xyz',
  generator: 'AppLauncher.xyz',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${splineSans.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}

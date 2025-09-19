// app/layout.tsx
import type { Metadata } from 'next';
import { Spline_Sans } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import dynamic from 'next/dynamic';
import './globals.css';

const splineSans = Spline_Sans({
  subsets: ['latin'],
  variable: '--font-spline-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AppLauncher App',
  description: 'Created with AppLauncher.xyz',
  generator: 'AppLauncher.xyz',
};

// IMPORTANT: use a relative path so this works even if @/* alias isn't active.
// From app/layout.tsx → components/creator-dashboard.tsx
const CreatorDashboard = dynamic(
  () => import('../components/creator-dashboard'),
  { ssr: false, loading: () => null }
);

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`font-sans ${splineSans.variable}`}>
        {children}
        {/* Client-only widget mounted safely after paint */}
        <CreatorDashboard />
        <Analytics />
      </body>
    </html>
  );
}
// app/layout.tsx
import type { Metadata } from 'next';
import { Spline_Sans } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import dynamic from 'next/dynamic';
import './globals.css';

const splineSans = Spline_Sans({
  subsets: ['latin'],
  variable: '--font-spline-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AppLauncher App',
  description: 'Created with AppLauncher.xyz',
  generator: 'AppLauncher.xyz',
};

// IMPORTANT: use a relative path so this works even if @/* alias isn't active.
// From app/layout.tsx → components/creator-dashboard.tsx
const CreatorDashboard = dynamic(
  () => import('../components/creator-dashboard'),
  { ssr: false, loading: () => null }
);

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`font-sans ${splineSans.variable}`}>
        {children}
        {/* Client-only widget mounted safely after paint */}
        <CreatorDashboard />
        <Analytics />
      </body>
    </html>
  );
}

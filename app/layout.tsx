import type {Metadata, Viewport} from 'next';
import './globals.css'; 
import { PWASetup } from '@/components/pwa-setup';
import { PWAInstall } from '@/components/pwa-install';

export const metadata: Metadata = {
  title: 'ANICHISOM | Creative OS',
  description: 'Browser-based operating system for creative dominance.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans bg-black text-slate-100 antialiased selection:bg-neon-blue selection:text-black" suppressHydrationWarning>
        {children}
        <PWASetup />
        <PWAInstall />
      </body>
    </html>
  );
}

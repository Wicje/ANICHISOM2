import type {Metadata} from 'next';
import './globals.css'; 
import { PWASetup } from '@/components/pwa-setup';
import { PWAInstall } from '@/components/pwa-install';

export const metadata: Metadata = {
  title: 'ANICHISOM | Creative OS',
  description: 'Browser-based operating system for creative dominance.',
  manifest: '/manifest.json',
  themeColor: '#000000',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0'
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className="font-sans bg-black text-slate-100 antialiased selection:bg-neon-blue selection:text-black" suppressHydrationWarning>
        {children}
        <PWASetup />
        <PWAInstall />
      </body>
    </html>
  );
}

import type {Metadata, Viewport} from 'next';
import { Inter, Montserrat, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css'; 
import { PWASetup } from '@/components/pwa-setup';
import { PWAInstall } from '@/components/pwa-install';
import { GlobalErrorHandlers } from '@/components/global-error-handlers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Continua',
  description: 'The persistent context layer. Pick up exactly where you stopped.',
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
    <html lang="en" className={`${inter.variable} ${montserrat.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="font-sans bg-black text-slate-100 antialiased selection:bg-neon-blue selection:text-black" suppressHydrationWarning>
        {children}
        <GlobalErrorHandlers />
        <PWASetup />
        <PWAInstall />
      </body>
    </html>
  );
}

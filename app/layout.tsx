import type {Metadata, Viewport} from 'next';
import { Inter, Montserrat, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css'; 
import { PWASetup } from '@/components/pwa-setup';
import { PWAInstall } from '@/components/pwa-install';
import { GlobalErrorHandlers } from '@/components/global-error-handlers';
import { HelpModal } from '@/components/help/help-modal';
import { TooltipProvider } from '@/components/ui/tooltip';

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Outfit:wght@400;600;700&family=Playfair+Display:ital,wght@0,600;1,400&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans bg-black text-slate-100 antialiased selection:bg-neon-blue selection:text-black" suppressHydrationWarning>
        <TooltipProvider delayDuration={200}>
          {children}
          <GlobalErrorHandlers />
          <PWASetup />
          <PWAInstall />
          <HelpModal />
        </TooltipProvider>
      </body>
    </html>
  );
}

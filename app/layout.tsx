import type {Metadata, Viewport} from 'next';
import Script from 'next/script';
import './globals.css';
import { PWASetup } from '@/components/pwa-setup';
import { PWAInstall } from '@/components/pwa-install';
import { GlobalErrorHandlers } from '@/components/global-error-handlers';
import { HelpModal } from '@/components/help/help-modal';
import { TooltipProvider } from '@/components/ui/tooltip';

const SITE_URL = 'https://continuaos.cc';
const SITE_NAME = 'Continua';
const OG_IMAGE = `${SITE_URL}/images/landing/coding-dark.jpg`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Continua — The Persistent Context Layer',
    template: '%s | Continua',
  },
  description:
    'Continua is a computing continuity layer that lets your identity, workspace, and work context move between machines. Pick up exactly where you stopped — on any device.',
  keywords: [
    'continuity layer',
    'workspace sync',
    'context preservation',
    'cross-device workflow',
    'persistent workspace',
    'developer productivity',
    'workspace restore',
    'device trust',
    'coding environment',
    'remote work',
    'team collaboration',
    'Continua',
    'continuaos',
  ],
  authors: [{ name: 'Continua' }],
  creator: 'Continua',
  publisher: 'Continua',
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'Continua — The Persistent Context Layer',
    description:
      'Your identity, workspace, and work context — moving between machines. Continua is a computing continuity layer for developers who work across devices.',
    images: [
      {
        url: OG_IMAGE,
        width: 1280,
        height: 720,
        alt: 'Continua — Pick up where you left off on any device',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Continua — The Persistent Context Layer',
    description:
      'Your identity, workspace, and work context — moving between machines. Pick up exactly where you stopped.',
    images: [OG_IMAGE],
    creator: '@continuaos',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-192.png',
  },
  other: {
    'msapplication-TileColor': '#10F4A0',
    'theme-color': '#060608',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#060608' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icons/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Outfit:wght@400;600;700&family=Playfair+Display:ital,wght@0,600;1,400&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {/* Plausible Analytics — privacy-friendly, no cookies */}
        <Script
          defer
          data-domain="continuaos.cc"
          src="https://plausible.io/js/script.tagged-events.js"
          strategy="afterInteractive"
        />
        {/* PostHog — product analytics */}
        <Script strategy="afterInteractive">{`
          !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
          posthog.init('phc_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', {
            api_host: 'https://us.i.posthog.com',
            person_profiles: 'identified_only',
          });
        `}</Script>
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

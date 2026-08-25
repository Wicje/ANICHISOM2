import type {NextConfig} from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';
// @ts-ignore
import withPWAInit from 'next-pwa';
import { withSentryConfig } from '@sentry/nextjs';

const withAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'motion/react'],
  },
  productionBrowserSourceMaps: false,
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  output: (process.env.NEXT_EXPORT === 'true' || process.env.TAURI_BUILD === 'true') ? 'export' : undefined,
  transpilePackages: ['motion'],
  serverExternalPackages: ['socket.io', 'pg', 'redis', 'minio', 'ws'],
  async headers() {
    return [
      {
        source: '/((?!api).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), display-capture=(self), geolocation=()',
          },
        ],
      },
    ];
  },
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }

    // Monaco Editor workers are handled by lib/monaco-config.ts
    // which points @monaco-editor/react to the local monaco-editor package.
    // No worker-loader needed — the local package bundles workers inline.

    return config;
  },
};

const sentryConfig = {
  // Only upload source maps / run Sentry build hooks when credentials exist,
  // so local dev and Tauri/export builds don't fail without them.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  telemetry: false,
  widenClientFileUpload: true,
  hideSourceMaps: true,
};

export default withSentryConfig(withAnalyzer(withPWA(nextConfig)), sentryConfig);

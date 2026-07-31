import type {NextConfig} from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';
// @ts-ignore
import withPWAInit from 'next-pwa';

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
  typescript: {
    ignoreBuildErrors: true,
  },
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
  output: (process.env.NEXT_EXPORT === 'true' || process.env.TAURI_BUILD === 'true') ? 'export' : 'standalone',
  transpilePackages: ['motion'],
  serverExternalPackages: ['socket.io', 'pg', 'redis', 'minio', 'ws'],
  async headers() {
    return [
      {
        source: '/((?!api).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=(), interest-cohort=()',
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

export default withAnalyzer(withPWA(nextConfig));

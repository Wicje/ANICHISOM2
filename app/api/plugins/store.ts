/**
 * Shared in-memory plugin store for the Plugin API routes.
 *
 * Dev-only: swap to Firestore/PostgreSQL for production.
 */

export interface PluginListing {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  permissions: string[];
  runtime: 'iframe' | 'native';
  entryUrl?: string;
  roles: string[];
  tags: string[];
  source: string;
  rating: number;
  installCount: number;
  publishedAt: number;
  publisherId: string;
}

const pluginStore = new Map<string, PluginListing>();

// Seed example plugins
function seedPlugins() {
  if (pluginStore.size > 0) return;

  const examples: PluginListing[] = [
    {
      id: 'demo-analytics',
      name: 'Analytics Dashboard',
      version: '1.0.0',
      description: 'Real-time analytics dashboard with charts and export.',
      author: 'ANICHISOM Labs',
      category: 'analytics',
      permissions: ['workspace:read', 'files:read'],
      runtime: 'native',
      roles: ['admin', 'filmmaker', 'technician'],
      tags: ['analytics', 'charts', 'dashboard'],
      source: 'marketplace',
      rating: 4.5,
      installCount: 23,
      publishedAt: Date.now() - 86400000 * 3,
      publisherId: 'seed',
    },
    {
      id: 'demo-slack-bridge',
      name: 'Slack Bridge',
      version: '0.9.0',
      description: 'Send notifications and sync messages with Slack workspaces.',
      author: 'ANICHISOM Labs',
      category: 'communication',
      permissions: ['network:fetch', 'notifications:send', 'workspace:read'],
      runtime: 'iframe',
      entryUrl: 'https://slack-bridge.example.com',
      roles: ['admin', 'filmmaker', 'technician', 'designer'],
      tags: ['slack', 'communication', 'notifications'],
      source: 'marketplace',
      rating: 4.2,
      installCount: 15,
      publishedAt: Date.now() - 86400000 * 7,
      publisherId: 'seed',
    },
    {
      id: 'demo-color-palette',
      name: 'Color Palette Generator',
      version: '2.1.0',
      description: 'AI-powered color palette generator with accessibility checks.',
      author: 'ANICHISOM Labs',
      category: 'creative',
      permissions: ['ai:query'],
      runtime: 'native',
      roles: ['admin', 'filmmaker', 'technician', 'designer', 'client', 'user'],
      tags: ['design', 'colors', 'accessibility', 'ai'],
      source: 'marketplace',
      rating: 4.8,
      installCount: 42,
      publishedAt: Date.now() - 86400000 * 14,
      publisherId: 'seed',
    },
  ];

  examples.forEach(p => pluginStore.set(p.id, p));
}

seedPlugins();

export function getPluginStore(): Map<string, PluginListing> {
  return pluginStore;
}
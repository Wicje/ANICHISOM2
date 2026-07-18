/**
 * Shared plugin store for the Plugin API routes.
 *
 * Uses Supabase for persistence. Falls back to seed data if table is empty.
 */

import { createClient } from '@/utils/supabase/server';

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

// Seed data for initial population
const SEED_PLUGINS: PluginListing[] = [
  {
    id: 'demo-analytics',
    name: 'Analytics Dashboard',
    version: '1.0.0',
    description: 'Real-time analytics dashboard with charts and export.',
    author: 'ContinuaOS Labs',
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
    author: 'ContinuaOS Labs',
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
    author: 'ContinuaOS Labs',
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

export async function getPluginStore(): Promise<PluginListing[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('plugins')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error || !data || data.length === 0) {
      // Fall back to seed data
      return SEED_PLUGINS;
    }

    return data.map(p => ({
      id: p.id,
      name: p.name,
      version: '1.0.0',
      description: p.description,
      author: p.developer || 'Community',
      category: 'general',
      permissions: [],
      runtime: 'iframe' as const,
      roles: ['admin', 'user'],
      tags: [],
      source: 'marketplace',
      rating: 0,
      installCount: 0,
      publishedAt: new Date(p.createdAt).getTime(),
      publisherId: p.developer || 'community',
    }));
  } catch {
    return SEED_PLUGINS;
  }
}
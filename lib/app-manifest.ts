import React from 'react';
import {
  Terminal, FolderOpen, Globe, Palette, Code, Cpu, MessageSquare,
  PenTool, Eye, Monitor, LayoutTemplate, Settings, Store, Puzzle,
  FileText, Image, Music, Video, Calendar, CheckSquare, Users,
  BarChart3, Zap, Shield, Wrench, Camera, Layers, MousePointer,
  Home, Search, Bell, Moon, Sun, Grid, Bookmark, Share,
  Download, Upload, Trash2, Clock, Lock, Wifi, Bluetooth,
  Smartphone, MonitorSpeaker, Tv, Gamepad2, Joystick,
  HardDrive, Database, Server, Cloud, CloudOff, Box, Table,
  Calculator, Play, Circle, Headphones, Film, Mic, Briefcase, Phone, BookOpen,
  Layout, Sparkles
} from 'lucide-react';

export type AppManifestEntry = {
  id: string;
  component: React.ComponentType<any>;
  icon: React.ComponentType<any>;
  title: string;
  roles: string[];
  isCore: boolean;
  category: 'system' | 'creative' | 'productivity' | 'dev' | 'media' | 'social' | 'admin';
  description?: string;
};

// Lazy-loaded app component — only imported when window opens
const appRegistry: Record<string, () => Promise<{ default?: React.ComponentType<any>; [key: string]: any }>> = {
  terminal: () => import('@/components/apps/terminal'),
  files: () => import('@/components/apps/file-manager'),
  browser: () => import('@/components/apps/power-browser'),
  moodboard: () => import('@/components/apps/moodboard'),
  code: () => import('@/components/apps/code-editor'),
  campaign: () => import('@/components/apps/campaign-lab'),
  settings: () => import('@/components/apps/settings'),
  store: () => import('@/components/apps/app-store'),
  'plugin-sandbox': () => import('@/components/apps/plugin-sandbox'),
  'admin': () => import('@/components/apps/admin-panel'),
  'color-picker': () => import('@/components/apps/color-picker'),
  'calls': () => import('@/components/apps/calls'),

  'productivity': () => import('@/components/apps/productivity-suite'),
  'pdf-reader': () => import('@/components/apps/pdf-reader'),
  'screen-recorder': () => import('@/components/apps/screen-recorder'),
  'media-player': () => import('@/components/apps/media-player'),
  'hardware-manager': () => import('@/components/apps/hardware-manager'),
  'asset-pipeline': () => import('@/components/apps/asset-pipeline'),
  'config-manager': () => import('@/components/apps/config-manager'),
  'side-gigs': () => import('@/components/apps/side-gigs-pack'),
  'proposal-generator': () => import('@/components/apps/proposal-generator'),
  'history': () => import('@/components/apps/history'),
  'developer-pack': () => import('@/components/apps/developer-pack'),
  'photography-pack': () => import('@/components/apps/photography-pack'),
  'clothing-brand-pack': () => import('@/components/apps/clothing-brand-pack'),
  'hardware-pack': () => import('@/components/apps/hardware-pack'),
  'ziklag-forensics-pack': () => import('@/components/apps/ziklag-forensics-pack'),
  'ziklag-tools': () => import('@/components/apps/ziklag-tools'),
  'assistant': () => import('@/components/apps/assistant'),
  'brand-guides': () => import('@/components/apps/brand-guides'),
  'client-portal': () => import('@/components/apps/client-portal'),
  'privacy-settings': () => import('@/components/apps/privacy-settings'),
  'movie-browser': () => import('@/components/media/movie-browser'),
  'books-collection': () => import('@/components/media/books-collection'),
  'bookmarks-sidebar': () => import('@/components/notifications/bookmarks-sidebar'),
  'campaign-dashboard': () => import('@/components/campaignlab/project-dashboard'),
  'campaign-timeline': () => import('@/components/campaignlab/timeline-view'),
  'campaign-community': () => import('@/components/campaignlab/community-page'),
  'digital-journal': () => import('@/components/campaignlab/digital-journal'),
  'campaign-files': () => import('@/components/campaignlab/file-management'),
  'canvas-board': () => import('@/components/moodboard/canvas-board'),
  'digital-library': () => import('@/components/moodboard/digital-library'),
  'nothing-product': () => import('@/components/moodboard/nothing-product'),
  'samur-ai-board': () => import('@/components/moodboard/samur-ai-board'),
  'notification-settings': () => import('@/components/settings/notification-settings'),
  'widget-stack': () => import('@/components/notifications/widget-stack'),
  'side-gigs-marketplace': () => import('@/components/side-gigs-marketplace'),
};

// Static metadata — loaded eagerly (tiny)
export const APP_MANIFEST: AppManifestEntry[] = [
  // System
  { id: 'terminal', component: null as any, icon: Terminal, title: 'Terminal', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: true, category: 'system', description: 'System terminal for command-line operations' },
  { id: 'files', component: null as any, icon: FolderOpen, title: 'File Manager', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: true, category: 'system', description: 'Manage files and folders' },
  { id: 'settings', component: null as any, icon: Settings, title: 'Settings', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: true, category: 'system', description: 'System preferences and configuration' },
  { id: 'store', component: null as any, icon: Store, title: 'App Store', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: true, category: 'system', description: 'Install new apps and extensions' },
  { id: 'admin', component: null as any, icon: Shield, title: 'Admin Panel', roles: ['admin'], isCore: true, category: 'admin', description: 'User and system administration' },
  { id: 'config-manager', component: null as any, icon: Wrench, title: 'Config Manager', roles: ['admin', 'filmmaker', 'technician'], isCore: false, category: 'system', description: 'System configuration management' },
  { id: 'plugin-sandbox', component: null as any, icon: Puzzle, title: 'Plugin Sandbox', roles: ['admin', 'filmmaker', 'technician'], isCore: false, category: 'system', description: 'Run third-party plugins safely' },
  { id: 'privacy-settings', component: null as any, icon: Shield, title: 'Privacy Settings', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'system', description: 'Per-app privacy controls and encryption settings' },
  { id: 'history', component: null as any, icon: Clock, title: 'History', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'system', description: 'Activity history' },

  // Creative
  { id: 'moodboard', component: null as any, icon: Palette, title: 'Moodboard', roles: ['admin', 'filmmaker', 'designer'], isCore: false, category: 'creative', description: 'Visual inspiration board' },
  { id: 'brand-guides', component: null as any, icon: Palette, title: 'Brand Guides', roles: ['admin', 'filmmaker', 'designer'], isCore: false, category: 'creative', description: 'Brand style guide editor' },
  { id: 'client-portal', component: null as any, icon: Eye, title: 'Client Portal', roles: ['admin', 'filmmaker', 'client'], isCore: false, category: 'creative', description: 'Client-facing project portal' },
  { id: 'color-picker', component: null as any, icon: Palette, title: 'Color Picker', roles: ['admin', 'filmmaker', 'designer'], isCore: false, category: 'creative', description: 'Pick and manage colors' },
  { id: 'photography-pack', component: null as any, icon: Camera, title: 'Photography Pack', roles: ['admin', 'filmmaker', 'technician'], isCore: false, category: 'creative', description: 'Photography tools suite' },

  // Dev
  { id: 'code', component: null as any, icon: Code, title: 'Code Editor', roles: ['admin', 'filmmaker', 'technician'], isCore: false, category: 'dev', description: 'Full-featured code editor' },
  { id: 'browser', component: null as any, icon: Globe, title: 'Power Browser', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'dev', description: 'Browser with pinned apps, persistent sessions, and context memory' },
  { id: 'developer-pack', component: null as any, icon: Code, title: 'Developer Pack', roles: ['admin', 'filmmaker', 'technician'], isCore: false, category: 'dev', description: 'Developer tools bundle' },
  { id: 'hardware-manager', component: null as any, icon: HardDrive, title: 'Hardware Manager', roles: ['admin', 'filmmaker', 'technician'], isCore: false, category: 'dev', description: 'Hardware device management' },
  { id: 'asset-pipeline', component: null as any, icon: Layers, title: 'Asset Pipeline', roles: ['admin', 'filmmaker', 'technician'], isCore: false, category: 'dev', description: 'Asset processing pipeline' },
  { id: 'assistant', component: null as any, icon: MessageSquare, title: 'Assistant', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'dev', description: 'AI-powered assistant' },

  // Productivity
  { id: 'campaign', component: null as any, icon: Zap, title: 'Campaign Lab', roles: ['admin', 'filmmaker', 'user', 'technician', 'photographer', 'developer', 'designer', 'marketer', 'business', 'student', 'other'], isCore: false, category: 'productivity', description: 'Campaign management and analytics' },
  { id: 'productivity', component: null as any, icon: Grid, title: 'Productivity Suite', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'productivity', description: 'All-in-one productivity tools' },
  { id: 'proposal-generator', component: null as any, icon: FileText, title: 'Proposal Generator', roles: ['admin', 'filmmaker'], isCore: false, category: 'productivity', description: 'Generate proposals and estimates' },
  { id: 'side-gigs', component: null as any, icon: Briefcase, title: 'Side Gigs', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'productivity', description: 'Manage side projects and gigs' },
  { id: 'side-gigs-marketplace', component: null as any, icon: Briefcase, title: 'Side Gigs Marketplace', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'productivity', description: 'Freelance opportunity marketplace' },
  { id: 'calls', component: null as any, icon: Phone, title: 'Calls', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'productivity', description: 'Video and voice calls' },

  // Media
  { id: 'media-player', component: null as any, icon: Play, title: 'Media Player', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'media', description: 'Media player for video and audio' },
  { id: 'pdf-reader', component: null as any, icon: FileText, title: 'PDF Reader', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'media', description: 'PDF viewer' },
  { id: 'screen-recorder', component: null as any, icon: Circle, title: 'Screen Recorder', roles: ['admin', 'filmmaker', 'technician'], isCore: false, category: 'media', description: 'Screen recording tool' },
  { id: 'movie-browser', component: null as any, icon: Film, title: 'Movie Browser', roles: ['admin', 'filmmaker', 'user'], isCore: false, category: 'media', description: 'Browse popular movies and TV shows' },
  { id: 'books-collection', component: null as any, icon: BookOpen, title: 'Books Collection', roles: ['admin', 'filmmaker', 'user'], isCore: false, category: 'media', description: 'A curated collection of books and reading materials' },
  { id: 'bookmarks-sidebar', component: null as any, icon: Bookmark, title: 'Bookmarks', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'productivity', description: 'Save and organize your favorite bookmarks' },

  // Campaign Lab Views
  { id: 'campaign-dashboard', component: null as any, icon: Layout, title: 'Campaign Dashboard', roles: ['admin', 'filmmaker', 'marketer'], isCore: false, category: 'productivity', description: 'Campaign project dashboard and overview' },
  { id: 'campaign-timeline', component: null as any, icon: Clock, title: 'Campaign Timeline', roles: ['admin', 'filmmaker', 'marketer'], isCore: false, category: 'productivity', description: 'Campaign timeline and scheduling view' },
  { id: 'campaign-community', component: null as any, icon: Users, title: 'Campaign Community', roles: ['admin', 'filmmaker', 'marketer'], isCore: false, category: 'social', description: 'Campaign community and collaboration page' },
  { id: 'digital-journal', component: null as any, icon: FileText, title: 'Digital Journal', roles: ['admin', 'filmmaker', 'user'], isCore: false, category: 'productivity', description: 'Digital journal and notes' },
  { id: 'campaign-files', component: null as any, icon: FolderOpen, title: 'Campaign Files', roles: ['admin', 'filmmaker', 'marketer'], isCore: false, category: 'productivity', description: 'Campaign file management' },

  // Moodboard Views
  { id: 'canvas-board', component: null as any, icon: Palette, title: 'Canvas Board', roles: ['admin', 'filmmaker', 'designer'], isCore: false, category: 'creative', description: 'Visual canvas board for notes and images' },
  { id: 'digital-library', component: null as any, icon: BookOpen, title: 'Digital Library', roles: ['admin', 'filmmaker', 'designer'], isCore: false, category: 'creative', description: 'Digital asset library and collection' },
  { id: 'nothing-product', component: null as any, icon: Eye, title: 'Nothing Product', roles: ['admin', 'filmmaker', 'designer'], isCore: false, category: 'creative', description: 'Product visualization board' },
  { id: 'samur-ai-board', component: null as any, icon: Sparkles, title: 'SamurAI Board', roles: ['admin', 'filmmaker', 'designer'], isCore: false, category: 'creative', description: 'AI-powered creative board' },

  // Dock & Widgets
  { id: 'notification-settings', component: null as any, icon: Bell, title: 'Notification Settings', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'system', description: 'Configure notification preferences' },
  { id: 'widget-stack', component: null as any, icon: Layout, title: 'Widget Stack', roles: ['admin', 'filmmaker', 'user'], isCore: false, category: 'system', description: 'Stackable desktop widgets' },

  // Packs
  { id: 'clothing-brand-pack', component: null as any, icon: Grid, title: 'Clothing Brand Pack', roles: ['admin', 'filmmaker'], isCore: false, category: 'creative', description: 'Clothing brand management tools' },
  { id: 'hardware-pack', component: null as any, icon: HardDrive, title: 'Hardware Pack', roles: ['admin', 'filmmaker', 'technician'], isCore: false, category: 'dev', description: 'Hardware integration tools' },
  { id: 'ziklag-tools', component: null as any, icon: Wrench, title: 'Ziklag Tools', roles: ['admin', 'filmmaker'], isCore: false, category: 'system', description: 'Ziklag platform tools' },
  { id: 'ziklag-forensics-pack', component: null as any, icon: Shield, title: 'Ziklag Forensics', roles: ['admin', 'technician'], isCore: false, category: 'dev', description: 'Forensic case management, evidence tracking, and chain of custody' },
];

// Dynamic import resolver — handles both default and named exports
export async function resolveAppComponent(appId: string): Promise<React.ComponentType<any> | null> {
  const loader = appRegistry[appId];
  if (!loader) return null;
  const mod = await loader();
  // Support both default export and named export (e.g. Terminal, Browser, etc.)
  if (mod.default) return mod.default;
  // Try capitalized name convention: 'terminal' -> 'Terminal'
  const namedExport = mod[appId.charAt(0).toUpperCase() + appId.slice(1)];
  if (namedExport && typeof namedExport === 'function') return namedExport;
  // Return first function export found
  const firstFn = Object.values(mod).find((v) => typeof v === 'function');
  return (firstFn as React.ComponentType<any>) || null;
}

// Get manifest entry by ID
export function getManifestEntry(appId: string): AppManifestEntry | undefined {
  return APP_MANIFEST.find((app) => app.id === appId);
}

// Get all apps for a given role
export function getAppsForRole(role: string): AppManifestEntry[] {
  return APP_MANIFEST.filter((app) => app.roles.includes(role));
}

// Get apps by category
export function getAppsByCategory(category: AppManifestEntry['category']): AppManifestEntry[] {
  return APP_MANIFEST.filter((app) => app.category === category);
}

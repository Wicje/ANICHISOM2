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
  Layout, Sparkles, Activity
} from 'lucide-react';

export type AppManifestEntry = {
  id: string;
  component: React.ComponentType<any>;
  icon: React.ComponentType<any>;
  iconImage?: string; // URL or data:image URI for real app icons
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
  'app-store': () => import('@/components/apps/app-store'),
  'plugin-sandbox': () => import('@/components/apps/plugin-sandbox'),
  'admin': () => import('@/components/apps/admin-panel'),
  'color-picker': () => import('@/components/apps/color-picker'),
  'calls': () => import('@/components/apps/calls'),

  'productivity': () => import('@/components/apps/productivity-suite'),
  'pdf-reader': () => import('@/components/apps/pdf-reader'),
  'screen-recorder': () => import('@/components/apps/screen-recorder'),
  'media-player': () => import('@/components/apps/media-player'),
  'hardware-manager': () => import('@/components/apps/hardware-manager'),
  'virtual-display-manager': () => import('@/components/apps/virtual-display-manager'),
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
  'digital-journal': () => import('@/components/campaignlab/digital-journal'),
  'digital-library': () => import('@/components/moodboard/digital-library'),
  'notification-settings': () => import('@/components/settings/notification-settings'),
  'analytics': () => import('@/components/apps/analytics/dashboard'),
  'image-viewer': () => import('@/components/apps/image-viewer'),
  'web-app': () => import('@/components/apps/web-app'),
  'figma': () => import('@/components/apps/web-app'),
  'notion': () => import('@/components/apps/web-app'),
  'spotify': () => import('@/components/apps/web-app'),
  'discord': () => import('@/components/apps/web-app'),
  'vscode': () => import('@/components/apps/web-app'),
};

// SVG data URIs — vibrant high-resolution 3D vector app icons
const ICO = {
  // Mail — Gmail-inspired M
  mail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%23fff'/%3E%3Crect x='22' y='34' width='76' height='52' rx='6' fill='%23f1f1f1' stroke='%23e0e0e0' stroke-width='2'/%3E%3Cpath d='M22 40l38 26 38-26' stroke='%23ea4335' stroke-width='4' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E",
  // Users — Slack-inspired multi-color people
  users: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%23611f69'/%3E%3Ccircle cx='42' cy='45' r='14' fill='%2336c5f0'/%3E%3Ccircle cx='78' cy='45' r='14' fill='%232eb67d'/%3E%3Ccircle cx='42' cy='78' r='14' fill='%23ecb22e'/%3E%3Ccircle cx='78' cy='78' r='14' fill='%23e01e5a'/%3E%3C/svg%3E",
  // Chart — Figma-inspired colorful bars
  chart: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%231e1e1e'/%3E%3Crect x='24' y='60' width='16' height='30' rx='4' fill='%23f24e1e'/%3E%3Crect x='46' y='40' width='16' height='50' rx='4' fill='%23ff7262'/%3E%3Crect x='68' y='28' width='16' height='62' rx='4' fill='%23a259ff'/%3E%3Crect x='90' y='48' width='16' height='42' rx='4' fill='%231abcfe'/%3E%3C/svg%3E",
  // Camera — Instagram-inspired gradient camera
  camera: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0' y1='1' x2='1' y2='0'%3E%3Cstop offset='0%25' stop-color='%23feda75'/%3E%3Cstop offset='25%25' stop-color='%23fa7e1e'/%3E%3Cstop offset='50%25' stop-color='%23d62976'/%3E%3Cstop offset='75%25' stop-color='%23962fbf'/%3E%3Cstop offset='100%25' stop-color='%234f5bd5'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='26' fill='url(%23a)'/%3E%3Crect x='24' y='24' width='72' height='72' rx='20' stroke='%23fff' stroke-width='4' fill='none'/%3E%3Ccircle cx='60' cy='60' r='20' stroke='%23fff' stroke-width='4' fill='none'/%3E%3Ccircle cx='85' cy='35' r='5' fill='%23fff'/%3E%3C/svg%3E",
  // Sparkles — DALL-E/OpenAI inspired
  sparkles: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%23000'/%3E%3Cpath d='M60 20l10 25h25l-20 15 8 25-23-15-23 15 8-25-20-15h25z' fill='%2310a37f'/%3E%3Ccircle cx='88' cy='85' r='4' fill='%2310a37f' opacity='.5'/%3E%3Ccircle cx='32' cy='90' r='3' fill='%2310a37f' opacity='.3'/%3E%3C/svg%3E",
  // Puzzle — Figma/plugin style
  puzzle: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23ff7262'/%3E%3Cstop offset='100%25' stop-color='%23f24e1e'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='26' fill='url(%23a)'/%3E%3Cpath d='M40 35h16c4 0 4 4 4 4v12c0 2 2 4 4 4h12c4 0 4 4 4 4v16c0 4-4 4-4 4H64c-2 0-4 2-4 4v12c0 4-4 4-4 4H40c-4 0-4-4-4-4V67c0-2-2-4-4-4H20c-4 0-4-4-4-4V43c0-4 4-8 8-8' fill='%23fff' opacity='.9'/%3E%3C/svg%3E",
  // Shield — NordVPN-style blue shield
  shield: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%2369d2f7'/%3E%3Cstop offset='100%25' stop-color='%231b3a5c'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='26' fill='url(%23a)'/%3E%3Cpath d='M60 20l32 14v24c0 22-32 38-32 38s-32-16-32-38V34z' fill='%23fff' opacity='.2'/%3E%3Cpath d='M48 62l8 8 16-16' stroke='%23fff' stroke-width='5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E",
  // Notification — iOS-style yellow bell
  notification: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%23ffcc00'/%3E%3Cpath d='M48 28c-14 0-22 10-22 24v20l-8 8v4h60v-4l-8-8V52c0-14-8-24-22-24z' fill='%23fff'/%3E%3Cpath d='M48 84c0 7 5 12 12 12s12-5 12-12' fill='%23fff' opacity='.6'/%3E%3C/svg%3E",
  // Clock — Things 3-style minimal clock
  clock: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%23f5f5f7'/%3E%3Ccircle cx='60' cy='60' r='32' stroke='%231d1d1f' stroke-width='4' fill='none'/%3E%3Cline x1='60' y1='60' x2='60' y2='38' stroke='%231d1d1f' stroke-width='4' stroke-linecap='round'/%3E%3Cline x1='60' y1='60' x2='76' y2='70' stroke='%231d1d1f' stroke-width='3' stroke-linecap='round'/%3E%3Ccircle cx='60' cy='60' r='3' fill='%231d1d1f'/%3E%3C/svg%3E",
  // Headphones — AirPods-style
  headphones: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%23f5f5f7'/%3E%3Cpath d='M28 62c0-18 14-32 32-32s32 14 32 32' stroke='%231d1d1f' stroke-width='5' fill='none' stroke-linecap='round'/%3E%3Crect x='22' y='58' width='14' height='26' rx='7' fill='%231d1d1f'/%3E%3Crect x='84' y='58' width='14' height='26' rx='7' fill='%231d1d1f'/%3E%3C/svg%3E",
  // Wallet — Apple Wallet style
  wallet: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%231d1d1f'/%3E%3Crect x='22' y='32' width='76' height='14' rx='7' fill='%23ff3b30'/%3E%3Crect x='22' y='50' width='76' height='14' rx='7' fill='%23ff9500'/%3E%3Crect x='22' y='68' width='76' height='14' rx='7' fill='%2334c759'/%3E%3Crect x='22' y='86' width='76' height='10' rx='5' fill='%23007aff'/%3E%3C/svg%3E",
  // Grid — Notion-style minimal grid
  grid: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%23000'/%3E%3Crect x='26' y='26' width='28' height='28' rx='4' fill='%23fff'/%3E%3Crect x='66' y='26' width='28' height='28' rx='4' fill='%23fff' opacity='.6'/%3E%3Crect x='26' y='66' width='28' height='28' rx='4' fill='%23fff' opacity='.6'/%3E%3Crect x='66' y='66' width='28' height='28' rx='4' fill='%23fff' opacity='.3'/%3E%3C/svg%3E",
  // Layout — Framer-inspired
  layout: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%230055ff'/%3E%3Cpath d='M30 30h60v30H50v30H30z' fill='%23fff' opacity='.9'/%3E%3C/svg%3E",
  // Eye — Dribbble-inspired pink eye
  eye: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%23ea4c89'/%3E%3Cpath d='M18 60s22-28 42-28 42 28 42 28-22 28-42 28-42-28-42-28z' stroke='%23fff' stroke-width='4' fill='none'/%3E%3Ccircle cx='60' cy='60' r='14' fill='%23fff'/%3E%3Ccircle cx='60' cy='60' r='6' fill='%23ea4c89'/%3E%3C/svg%3E",
  // Layers — Stripe-style gradient
  layers: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23635bff'/%3E%3Cstop offset='100%25' stop-color='%230a2540'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='26' fill='url(%23a)'/%3E%3Cpath d='M60 28l32 18-32 18-32-18z' fill='%23fff' opacity='.4'/%3E%3Cpath d='M60 48l32 18-32 18-32-18z' fill='%23fff' opacity='.7'/%3E%3Cpath d='M60 68l32 18-32 18-32-18z' fill='%23fff'/%3E%3C/svg%3E",
  // Wrench — Linear-style
  wrench: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%235e6ad2'/%3E%3Cpath d='M78 28a24 24 0 0 0-32 32L26 80l6 6 20-20a24 24 0 0 0 32-32z' fill='%23fff'/%3E%3C/svg%3E",
  // Harddrive — Western Digital style
  harddrive: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%23006340'/%3E%3Crect x='22' y='36' width='76' height='48' rx='8' stroke='%23fff' stroke-width='4' fill='none'/%3E%3Ccircle cx='80' cy='60' r='6' fill='%23fff'/%3E%3Cline x1='22' y1='52' x2='56' y2='52' stroke='%23fff' stroke-width='2'/%3E%3C/svg%3E",
  // Gemini — Google Gemini-inspired
  gemini: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%231a73e8'/%3E%3Cstop offset='50%25' stop-color='%23e8453c'/%3E%3Cstop offset='100%25' stop-color='%23fbbc05'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='26' fill='%23000'/%3E%3Cpath d='M40 80c-10-10-10-28 0-40M80 80c10-10 10-28 0-40' stroke='url(%23a)' stroke-width='6' fill='none' stroke-linecap='round'/%3E%3Ccircle cx='60' cy='60' r='6' fill='%23fff'/%3E%3C/svg%3E",
  // Ziklag — forensic/tech style
  ziklag: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%231a1a2e'/%3E%3Crect x='28' y='32' width='64' height='56' rx='4' stroke='%2300ff88' stroke-width='3' fill='none'/%3E%3Cpath d='M48 50l8 8-8 8' stroke='%2300ff88' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cline x1='62' y1='66' x2='78' y2='66' stroke='%2300ff88' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E",
  // Analytics — chart/performance style
  analytics: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%2322c55e'/%3E%3Cstop offset='100%25' stop-color='%2316a34a'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='26' fill='url(%23a)'/%3E%3Cpath d='M28 80l20-20 16 10 28-34' stroke='%23fff' stroke-width='5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='28' cy='80' r='4' fill='%23fff'/%3E%3Ccircle cx='48' cy='60' r='4' fill='%23fff'/%3E%3Ccircle cx='64' cy='70' r='4' fill='%23fff'/%3E%3Ccircle cx='92' cy='36' r='4' fill='%23fff'/%3E%3C/svg%3E",
  // Bookmark — 3D Ribbon / Floating Bookmark Badge (Pinterest reference)
  bookmark: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%2338bdf8'/%3E%3Cstop offset='50%25' stop-color='%23818cf8'/%3E%3Cstop offset='100%25' stop-color='%23c084fc'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Cpath d='M36 22h48a6 6 0 0 1 6 6v70l-30-18-30 18V28a6 6 0 0 1 6-6z' fill='%23ffffff' shadow='0 10px 25px rgba(0,0,0,0.3)'/%3E%3Ccircle cx='60' cy='44' r='8' fill='%236366f1'/%3E%3C/svg%3E",
};

// Static metadata — loaded eagerly (tiny)
export const APP_MANIFEST: AppManifestEntry[] = [
  // System
  { id: 'terminal', component: null as any, icon: Terminal, iconImage: ICO.terminal, title: 'Terminal', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: true, category: 'system', description: 'System terminal for command-line operations' },
  { id: 'files', component: null as any, icon: FolderOpen, iconImage: ICO.files, title: 'File Manager', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: true, category: 'system', description: 'Manage files and folders' },
  { id: 'settings', component: null as any, icon: Settings, iconImage: ICO.settings, title: 'Settings', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: true, category: 'system', description: 'System preferences and configuration' },
  { id: 'store', component: null as any, icon: Store, iconImage: ICO.store, title: 'App Store', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: true, category: 'system', description: 'Install new apps and extensions' },
  { id: 'admin', component: null as any, icon: Shield, iconImage: ICO.admin, title: 'Admin Panel', roles: ['admin'], isCore: true, category: 'admin', description: 'User and system administration' },
  { id: 'config-manager', component: null as any, icon: Wrench, iconImage: ICO.wrench, title: 'Config Manager', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'system', description: 'System configuration management' },
  { id: 'plugin-sandbox', component: null as any, icon: Puzzle, iconImage: ICO.puzzle, title: 'Plugin Sandbox', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'system', description: 'Run third-party plugins safely' },
  { id: 'privacy-settings', component: null as any, icon: Shield, iconImage: ICO.shield, title: 'Privacy Settings', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'system', description: 'Per-app privacy controls and encryption settings' },
  { id: 'history', component: null as any, icon: Clock, iconImage: ICO.clock, title: 'History', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'system', description: 'Activity history' },

  // Creative
  { id: 'moodboard', component: null as any, icon: Palette, iconImage: ICO.moodboard, title: 'Moodboard', roles: ['admin', 'filmmaker', 'designer', 'user'], isCore: false, category: 'creative', description: 'Visual inspiration board' },
  { id: 'brand-guides', component: null as any, icon: Palette, iconImage: ICO.moodboard, title: 'Brand Guides', roles: ['admin', 'filmmaker', 'designer', 'user'], isCore: false, category: 'creative', description: 'Brand style guide editor' },
  { id: 'client-portal', component: null as any, icon: Eye, iconImage: ICO.eye, title: 'Client Portal', roles: ['admin', 'filmmaker', 'client'], isCore: false, category: 'creative', description: 'Client-facing project portal' },
  { id: 'color-picker', component: null as any, icon: Palette, iconImage: ICO.moodboard, title: 'Color Picker', roles: ['admin', 'filmmaker', 'designer', 'user'], isCore: false, category: 'creative', description: 'Pick and manage colors' },
  { id: 'photography-pack', component: null as any, icon: Camera, iconImage: ICO.camera, title: 'Photography Pack', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'creative', description: 'Photography tools suite' },

  // Dev
  { id: 'code', component: null as any, icon: Code, iconImage: ICO.code, title: 'Code Editor', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'dev', description: 'Full-featured code editor' },
  { id: 'browser', component: null as any, icon: Globe, iconImage: ICO.browser, title: 'Power Browser', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'dev', description: 'Browser with pinned apps, persistent sessions, and context memory' },
  { id: 'developer-pack', component: null as any, icon: Code, iconImage: ICO.code, title: 'Developer Pack', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'dev', description: 'Developer tools bundle' },
  { id: 'hardware-manager', component: null as any, icon: HardDrive, iconImage: ICO.harddrive, title: 'Hardware Manager', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'dev', description: 'Hardware device management' },
  { id: 'asset-pipeline', component: null as any, icon: Layers, iconImage: ICO.layers, title: 'Asset Pipeline', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'dev', description: 'Asset processing pipeline' },
  { id: 'assistant', component: null as any, icon: MessageSquare, iconImage: ICO.gemini, title: 'Assistant', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'dev', description: 'AI-powered assistant' },

  // Productivity
  { id: 'campaign', component: null as any, icon: Zap, iconImage: ICO.campaign, title: 'Campaign Lab', roles: ['admin', 'filmmaker', 'user', 'technician', 'photographer', 'developer', 'designer', 'marketer', 'business', 'student', 'other'], isCore: false, category: 'productivity', description: 'Campaign management and analytics' },
  { id: 'productivity', component: null as any, icon: Grid, iconImage: ICO.productivity, title: 'Productivity Suite', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'productivity', description: 'All-in-one productivity tools' },
  { id: 'proposal-generator', component: null as any, icon: FileText, iconImage: ICO.proposal, title: 'Proposal Generator', roles: ['admin', 'filmmaker', 'user'], isCore: false, category: 'productivity', description: 'Generate proposals and estimates' },
  { id: 'side-gigs', component: null as any, icon: Briefcase, iconImage: ICO.briefcase, title: 'Side Gigs', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'productivity', description: 'Manage side projects and gigs' },
  { id: 'calls', component: null as any, icon: Phone, iconImage: ICO.phone, title: 'Calls', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'productivity', description: 'Video and voice calls' },

  // Media
  { id: 'image-viewer', component: null as any, icon: Image, iconImage: ICO.camera, title: 'Image Viewer', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: true, category: 'media', description: 'View, zoom, rotate, and export images' },
  { id: 'media-player', component: null as any, icon: Play, iconImage: ICO.play, title: 'Media Player', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'media', description: 'Media player for video and audio' },
  { id: 'pdf-reader', component: null as any, icon: FileText, iconImage: ICO.pdf, title: 'PDF Reader', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'media', description: 'PDF viewer' },
  { id: 'screen-recorder', component: null as any, icon: Circle, iconImage: ICO.recorder, title: 'Screen Recorder', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'media', description: 'Screen recording tool' },
  { id: 'movie-browser', component: null as any, icon: Film, iconImage: ICO.film, title: 'Movie Browser', roles: ['admin', 'filmmaker', 'user'], isCore: false, category: 'media', description: 'Browse popular movies and TV shows' },
  { id: 'books-collection', component: null as any, icon: BookOpen, iconImage: ICO.book, title: 'Books Collection', roles: ['admin', 'filmmaker', 'user'], isCore: false, category: 'media', description: 'A curated collection of books and reading materials' },
  { id: 'bookmarks-sidebar', component: null as any, icon: Bookmark, iconImage: ICO.mail, title: 'Bookmarks', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'productivity', description: 'Save and organize your favorite bookmarks' },

  // Campaign Lab Views
  { id: 'digital-journal', component: null as any, icon: FileText, iconImage: ICO.book, title: 'Digital Journal', roles: ['admin', 'filmmaker', 'user', 'technician'], isCore: false, category: 'productivity', description: 'Digital journal and notes' },

  // Moodboard Views
  { id: 'digital-library', component: null as any, icon: BookOpen, iconImage: ICO.book, title: 'Digital Library', roles: ['admin', 'filmmaker', 'designer'], isCore: false, category: 'creative', description: 'Digital asset library and collection' },

  // Dock & Widgets
  { id: 'notification-settings', component: null as any, icon: Activity, iconImage: ICO.notification, title: 'Activity Monitor', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'system', description: 'Real-time system event timeline and activity log' },

  // Packs
  { id: 'clothing-brand-pack', component: null as any, icon: Grid, iconImage: ICO.grid, title: 'Clothing Brand Pack', roles: ['admin', 'filmmaker', 'user'], isCore: false, category: 'creative', description: 'Clothing brand management tools' },
  { id: 'hardware-pack', component: null as any, icon: HardDrive, iconImage: ICO.harddrive, title: 'Hardware Pack', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'dev', description: 'Hardware integration tools' },
  { id: 'ziklag-tools', component: null as any, icon: Wrench, iconImage: ICO.wrench, title: 'Ziklag Tools', roles: ['admin', 'filmmaker'], isCore: false, category: 'system', description: 'Ziklag platform tools' },
  { id: 'ziklag-forensics-pack', component: null as any, icon: Shield, iconImage: ICO.ziklag, title: 'Ziklag Forensics', roles: ['admin', 'technician'], isCore: false, category: 'dev', description: 'Forensic case management, evidence tracking, and chain of custody' },

  // Admin Tools
  { id: 'analytics', component: null as any, icon: BarChart3, iconImage: ICO.analytics, title: 'Analytics', roles: ['admin'], isCore: false, category: 'admin', description: 'Real-time performance and usage analytics dashboard' },

  // Native Web Apps (Ecosystem)
  { id: 'figma', component: null as any, icon: Palette, title: 'Figma', roles: ['admin', 'filmmaker', 'designer', 'user'], isCore: false, category: 'creative', description: 'Collaborative interface design tool' },
  { id: 'notion', component: null as any, icon: FileText, title: 'Notion', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'productivity', description: 'All-in-one workspace for your notes, tasks, wikis' },
  { id: 'spotify', component: null as any, icon: Headphones, iconImage: ICO.spotify, title: 'Spotify', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'media', description: 'Listen to music and podcasts via Spotify Web Player' },
  { id: 'discord', component: null as any, icon: MessageSquare, title: 'Discord', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'social', description: 'Chat and voice communication' },
  { id: 'vscode', component: null as any, icon: Code, title: 'VS Code Web', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'dev', description: 'Cloud-based code editor via StackBlitz' },
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

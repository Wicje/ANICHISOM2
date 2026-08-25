import React from 'react';
import {
  Terminal, FolderOpen, Globe, Palette, Code, MessageSquare,
  Settings, Store, Puzzle, FileText, Image, Play, Shield, Camera,
  Grid, Bookmark, HardDrive, Headphones, Film, Radio, Smartphone, Lock, Activity, Sparkles, Box
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

// Lazy-loaded app component registry — only imported when window opens
const appRegistry: Record<string, () => Promise<{ default?: React.ComponentType<any>; [key: string]: any }>> = {
  // Core System
  terminal: () => import('@/components/apps/terminal'),
  files: () => import('@/components/apps/file-manager'),
  browser: () => import('@/components/apps/power-browser'),
  settings: () => import('@/components/apps/settings'),
  store: () => import('@/components/apps/app-store'),
  'app-store': () => import('@/components/apps/app-store'),
  'plugin-sandbox': () => import('@/components/apps/plugin-sandbox'),
  admin: () => import('@/components/apps/admin-panel'),
  'hardware-manager': () => import('@/components/apps/hardware-manager'),
  'privacy-settings': () => import('@/components/apps/privacy-settings'),
  assistant: () => import('@/components/apps/assistant'),
  shortcuts: () => import('@/components/apps/shortcuts-app'),
  'continuity-hub': () => import('@/components/apps/continuity-hub'),
  'p2p-airdrop': () => import('@/components/apps/airdrop-app'),
  vault: () => import('@/components/apps/vault'),

  // Creative & Productivity
  moodboard: () => import('@/components/apps/moodboard'),
  code: () => import('@/components/apps/code-editor'),
  campaign: () => import('@/components/apps/campaign-lab'),
  productivity: () => import('@/components/apps/productivity-suite'),
  'brand-guides': () => import('@/components/apps/brand-guides'),
  'color-picker': () => import('@/components/apps/color-picker'),
  'photography-pack': () => import('@/components/apps/photography-pack'),

  // Media
  spotify: () => import('@/components/apps/spotify'),
  'movie-browser': () => import('@/components/media/movie-browser'),
  'image-viewer': () => import('@/components/apps/image-viewer'),
  'media-player': () => import('@/components/apps/media-player'),
  'pdf-reader': () => import('@/components/apps/pdf-reader'),
  'screen-recorder': () => import('@/components/apps/screen-recorder'),

  // First-Class Standalone Third-Party Web Apps (Freeing the Browser)
  figma: () => import('@/components/apps/web-app'),
  canva: () => import('@/components/apps/web-app'),
  linear: () => import('@/components/apps/web-app'),
  youtube: () => import('@/components/apps/web-app'),
};

// High-resolution vector app icons
const ICO = {
  terminal: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%230f172a'/%3E%3Cstop offset='100%25' stop-color='%23020617'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)' stroke='%23334155' stroke-width='2'/%3E%3Crect x='14' y='14' width='92' height='92' rx='20' fill='%23090d16' fill-opacity='.8' stroke='%231e293b' stroke-width='2'/%3E%3Cpath d='M32 44l22 16-22 16' stroke='%2310b981' stroke-width='7' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cline x1='60' y1='76' x2='88' y2='76' stroke='%2338bdf8' stroke-width='7' stroke-linecap='round'/%3E%3C/svg%3E",
  files: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%2338bdf8'/%3E%3Cstop offset='100%25' stop-color='%230284c7'/%3E%3C/linearGradient%3E%3ClinearGradient id='f' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%23ffffff'/%3E%3Cstop offset='100%25' stop-color='%23bae6fd'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Cpath d='M20 34c0-4.4 3.6-8 8-8h26l12 12h26c4.4 0 8 3.6 8 8v44c0 4.4-3.6 8-8 8H28c-4.4 0-8-3.6-8-8z' fill='url(%23f)'/%3E%3Cpath d='M20 48h80v42c0 4.4-3.6 8-8 8H28c-4.4 0-8-3.6-8-8z' fill='%23ffffff' opacity='.95'/%3E%3C/svg%3E",
  settings: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23f1f5f9'/%3E%3Cstop offset='100%25' stop-color='%2394a3b8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Ccircle cx='60' cy='60' r='28' stroke='%23334155' stroke-width='9' fill='none'/%3E%3Cg stroke='%23334155' stroke-width='8' stroke-linecap='round'%3E%3Cline x1='60' y1='18' x2='60' y2='32'/%3E%3Cline x1='60' y1='88' x2='60' y2='102'/%3E%3Cline x1='18' y1='60' x2='32' y2='60'/%3E%3Cline x1='88' y1='60' x2='102' y2='60'/%3E%3Cline x1='30' y1='30' x2='40' y2='40'/%3E%3Cline x1='80' y1='80' x2='90' y2='90'/%3E%3Cline x1='30' y1='90' x2='40' y2='80'/%3E%3Cline x1='80' y1='40' x2='90' y2='30'/%3E%3C/g%3E%3Ccircle cx='60' cy='60' r='10' fill='%230f172a'/%3E%3C/svg%3E",
  store: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%2310F4A0'/%3E%3Cstop offset='100%25' stop-color='%2300f0ff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Cpath d='M60 22L24 88h18l7-15h22l7 15h18zM54 60l6-14 6 14z' fill='%23060608'/%3E%3C/svg%3E",
  admin: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%23ef4444'/%3E%3Cstop offset='100%25' stop-color='%23991b1b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Cpath d='M60 20l36 16v28c0 24-36 40-36 40s-36-16-36-40V36z' fill='%23ffffff' fill-opacity='.2' stroke='%23ffffff' stroke-width='4'/%3E%3Cpath d='M44 60l12 12 24-24' stroke='%23ffffff' stroke-width='8' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E",
  moodboard: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23fb923c'/%3E%3Cstop offset='100%25' stop-color='%23ea580c'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Crect x='20' y='20' width='36' height='32' rx='8' fill='%23ffffff'/%3E%3Crect x='64' y='20' width='36' height='32' rx='8' fill='%23fef08a'/%3E%3Crect x='20' y='60' width='36' height='40' rx='8' fill='%23e0e7ff'/%3E%3Crect x='64' y='60' width='36' height='40' rx='8' fill='%23ffffff' fill-opacity='.8'/%3E%3C/svg%3E",
  code: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%230284c7'/%3E%3Cstop offset='100%25' stop-color='%230f172a'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Cpath d='M38 40L18 60l20 20' stroke='%2338bdf8' stroke-width='8' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M82 40l20 20-20 20' stroke='%2338bdf8' stroke-width='8' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cline x1='70' y1='32' x2='50' y2='88' stroke='%2338bdf8' stroke-width='6' stroke-linecap='round' opacity='.8'/%3E%3C/svg%3E",
  browser: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23ffffff'/%3E%3Cstop offset='100%25' stop-color='%23e2e8f0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Ccircle cx='60' cy='60' r='42' fill='none' stroke='%232563eb' stroke-width='8'/%3E%3Cpath d='M60 18a42 42 0 0 1 36.3 21H60' fill='%23ef4444'/%3E%3Cpath d='M96.3 39A42 42 0 0 1 78.8 96.3L60 60' fill='%2322c55e'/%3E%3Cpath d='M78.8 96.3A42 42 0 0 1 23.7 39L60 60' fill='%23eab308'/%3E%3Ccircle cx='60' cy='60' r='18' fill='%232563eb'/%3E%3Ccircle cx='60' cy='60' r='12' fill='%23ffffff'/%3E%3C/svg%3E",
  campaign: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%2318181b'/%3E%3Cstop offset='100%25' stop-color='%2309090b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)' stroke='%2327272a' stroke-width='2'/%3E%3Cpath d='M30 90V30l30-12 30 12v60l-30 12z' fill='%23ffffff' fill-opacity='.9'/%3E%3Cpath d='M30 30l30 12 30-12' fill='none' stroke='%2318181b' stroke-width='4'/%3E%3Cline x1='60' y1='42' x2='60' y2='102' stroke='%2318181b' stroke-width='4'/%3E%3C/svg%3E",
  shortcuts: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23ec4899'/%3E%3Cstop offset='100%25' stop-color='%238b5cf6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Cpath d='M65 24L35 68h24l-6 28 30-44H59z' fill='%23ffffff' stroke='%23ffffff' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E",
  productivity: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='28' fill='%23ffffff'/%3E%3Crect x='22' y='22' width='34' height='34' rx='10' fill='%233b82f6'/%3E%3Crect x='64' y='22' width='34' height='34' rx='10' fill='%23ef4444'/%3E%3Crect x='22' y='64' width='34' height='34' rx='10' fill='%2322c55e'/%3E%3Crect x='64' y='64' width='34' height='34' rx='10' fill='%23eab308'/%3E%3C/svg%3E",
  play: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23dc2626'/%3E%3Cstop offset='100%25' stop-color='%23991b1b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Cpolygon points='44,28 44,92 94,60' fill='%23ffffff'/%3E%3C/svg%3E",
  pdf: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23ef4444'/%3E%3Cstop offset='100%25' stop-color='%23b91c1c'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Crect x='28' y='20' width='64' height='80' rx='8' fill='%23ffffff'/%3E%3Ctext x='60' y='68' text-anchor='middle' font-size='22' font-weight='900' fill='%23dc2626' font-family='system-ui'%3EPDF%3C/text%3E%3C/svg%3E",
  recorder: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='28' fill='%2318181b'/%3E%3Ccircle cx='60' cy='54' r='26' stroke='%23ffffff' stroke-width='6' fill='none'/%3E%3Ccircle cx='60' cy='54' r='12' fill='%23ef4444'/%3E%3Crect x='36' y='88' width='48' height='8' rx='4' fill='%233f3f46'/%3E%3C/svg%3E",
  film: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='28' fill='%23000000'/%3E%3Cpath d='M34 94V26l26 36 26-36v68' stroke='%23e50914' stroke-width='10' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E",
  camera: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='1' x2='1' y2='0'%3E%3Cstop offset='0%25' stop-color='%23facc15'/%3E%3Cstop offset='30%25' stop-color='%23fb923c'/%3E%3Cstop offset='60%25' stop-color='%23ec4899'/%3E%3Cstop offset='100%25' stop-color='%238b5cf6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Crect x='22' y='22' width='76' height='76' rx='22' stroke='%23ffffff' stroke-width='6' fill='none'/%3E%3Ccircle cx='60' cy='60' r='22' stroke='%23ffffff' stroke-width='6' fill='none'/%3E%3Ccircle cx='86' cy='34' r='6' fill='%23ffffff'/%3E%3C/svg%3E",
  gemini: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%2318181b'/%3E%3Cstop offset='100%25' stop-color='%2309090b'/%3E%3C/linearGradient%3E%3ClinearGradient id='star' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%2338bdf8'/%3E%3Cstop offset='50%25' stop-color='%23c084fc'/%3E%3Cstop offset='100%25' stop-color='%23f43f5e'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)' stroke='%2327272a' stroke-width='2'/%3E%3Cpath d='M60 16c0 24.3 19.7 44 44 44-24.3 0-44 19.7-44 44 0-24.3-19.7-44-44-44 24.3 0 44-19.7 44-44z' fill='url(%23star)'/%3E%3C/svg%3E",
  spotify: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='28' fill='%231ed760'/%3E%3Cpath d='M30 42c24-8 48-5 64 5M34 60c20-6 40-4 52 4M38 78c16-4 30-2 40 4' stroke='%23000000' stroke-width='9' fill='none' stroke-linecap='round'/%3E%3C/svg%3E",
  harddrive: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='28' fill='%23059669'/%3E%3Crect x='22' y='36' width='76' height='48' rx='10' stroke='%23ffffff' stroke-width='6' fill='none'/%3E%3Ccircle cx='80' cy='60' r='8' fill='%23ffffff'/%3E%3C/svg%3E",
  shield: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='28' fill='%230284c7'/%3E%3Cpath d='M60 20l32 14v24c0 22-32 38-32 38s-32-16-32-38V34z' fill='%23ffffff' fill-opacity='.3'/%3E%3Cpath d='M48 62l8 8 16-16' stroke='%23ffffff' stroke-width='6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E",
  puzzle: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='28' fill='%23f24e1e'/%3E%3Cpath d='M40 35h16c4 0 4 4 4 4v12c0 2 2 4 4 4h12c4 0 4 4 4 4v16c0 4-4 4-4 4H64c-2 0-4 2-4 4v12c0 4-4 4-4 4H40c-4 0-4-4-4-4V67c0-2-2-4-4-4H20c-4 0-4-4-4-4V43c0-4 4-8 8-8' fill='%23ffffff'/%3E%3C/svg%3E",
  figma: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='28' fill='%231e1e1e'/%3E%3Cpath d='M42 32h18v18H42z' fill='%23f24e1e'/%3E%3Cpath d='M60 32h18a9 9 0 0 1 9 9 9 9 0 0 1-9 9H60z' fill='%23ff7262'/%3E%3Cpath d='M42 50h18v18H42z' fill='%23a259ff'/%3E%3Ccircle cx='69' cy='59' r='9' fill='%231abcfe'/%3E%3Cpath d='M42 68h18v9a9 9 0 0 1-9 9 9 9 0 0 1-9-9z' fill='%230acf83'/%3E%3C/svg%3E",

  youtube: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='28' fill='%23FF0000'/%3E%3Cpath d='M88 44s-1-6-3-8c-3-3-6-3-8-4-12-1-30-1-30-1s-18 0-30 1c-2 1-5 1-8 4-2 2-3 8-3 8S5 51 5 58v7c0 7 1 14 1 14s1 6 3 8c3 3 6 3 8 4 12 1 30 1 30 1s18 0 30-1c2-1 5-1 8-4 2-2 3-8 3-8s1-7 1-14v-7c0-7-1-14-1-14z' fill='%23ffffff'/%3E%3Cpolygon points='52,50 52,70 70,60' fill='%23FF0000'/%3E%3C/svg%3E",
};

// Static metadata — loaded eagerly
export const APP_MANIFEST: AppManifestEntry[] = [
  // Core System
  { id: 'terminal', component: null as any, icon: Terminal, iconImage: ICO.terminal, title: 'Terminal', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: true, category: 'system', description: 'System terminal with UNIX pipelines, virtual PID supervisor, and WASM sandboxing' },
  { id: 'files', component: null as any, icon: FolderOpen, iconImage: ICO.files, title: 'Files', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: true, category: 'system', description: 'Manage local files, OPFS storage, cloud drives, and local directory mounts' },
  { id: 'settings', component: null as any, icon: Settings, iconImage: ICO.settings, title: 'Settings', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: true, category: 'system', description: 'System preferences, wallpapers, BYOK AI keys, and Zero-Trace privacy vault' },
  { id: 'store', component: null as any, icon: Store, iconImage: ICO.store, title: 'App Store', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: true, category: 'system', description: 'Discover, install, and run native extensions and web tools' },
  { id: 'hardware-manager', component: null as any, icon: HardDrive, iconImage: ICO.harddrive, title: 'Activity Monitor', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'system', description: 'Live process manager, CPU/RAM telemetry, GPU compute inspector, and Force Quit' },
  { id: 'admin', component: null as any, icon: Shield, iconImage: ICO.admin, title: 'Admin Panel', roles: ['admin'], isCore: true, category: 'admin', description: 'User roles, invite codes, and system telemetry' },
  { id: 'plugin-sandbox', component: null as any, icon: Puzzle, iconImage: ICO.puzzle, title: 'Plugin Sandbox', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'system', description: 'Run sandboxed third-party plugins securely' },
  { id: 'privacy-settings', component: null as any, icon: Shield, iconImage: ICO.shield, title: 'Privacy Settings', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'system', description: 'Zero-Trace mode, data encryption, and per-app permissions' },

  // Web & AI
  { id: 'browser', component: null as any, icon: Globe, iconImage: ICO.browser, title: 'Power Browser', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: true, category: 'productivity', description: 'Multi-tab web browser with session memory, ad-shield, and deep context sync' },
  { id: 'assistant', component: null as any, icon: MessageSquare, iconImage: ICO.gemini, title: 'Assistant', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: true, category: 'productivity', description: 'AI Assistant powered by Gemini, Claude, GPT-4o, and Local Ollama' },

  // Creative & Productivity
  { id: 'moodboard', component: null as any, icon: Palette, iconImage: ICO.moodboard, title: 'Moodboard Canvas', roles: ['admin', 'filmmaker', 'designer', 'user'], isCore: false, category: 'creative', description: 'Infinite visual moodboard, color palette extractor, and asset curation' },
  { id: 'campaign', component: null as any, icon: Sparkles, iconImage: ICO.campaign, title: 'Campaign Lab', roles: ['admin', 'filmmaker', 'user', 'technician'], isCore: false, category: 'productivity', description: 'Creative campaign planning, digital journal, and project timelines' },
  { id: 'code', component: null as any, icon: Code, iconImage: ICO.code, title: 'Code Editor', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'dev', description: 'Monaco code editor with multi-file tabs, syntax highlighting, and live preview' },
  { id: 'productivity', component: null as any, icon: Grid, iconImage: ICO.productivity, title: 'Productivity Suite', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'productivity', description: 'Documents, spreadsheets, and collaborative task boards' },
  { id: 'shortcuts', component: null as any, icon: Sparkles, iconImage: ICO.shortcuts, title: 'Shortcuts', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'productivity', description: 'Visual workflow automations and quick actions' },
  { id: 'continuity-hub', component: null as any, icon: Smartphone, iconImage: ICO.admin, title: 'Continuity Hub', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'productivity', description: 'Continuity Camera, Desk View, and Universal Clipboard' },
  { id: 'p2p-airdrop', component: null as any, icon: Radio, iconImage: ICO.campaign, title: 'AirDrop P2P', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'productivity', description: 'Zero-config WebRTC peer-to-peer file transfer and clipboard sync' },
  { id: 'vault', component: null as any, icon: Lock, iconImage: ICO.admin, title: 'Encrypted Vault', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'productivity', description: 'AES-256-GCM zero-knowledge file encryption vault' },

  // Media
  { id: 'spotify', component: null as any, icon: Headphones, iconImage: ICO.spotify, title: 'Spotify', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'media', description: 'Live Spotify hit playlists, embed player, and Dynamic Notch integration' },
  { id: 'movie-browser', component: null as any, icon: Film, iconImage: ICO.film, title: 'Cinema Hub', roles: ['admin', 'filmmaker', 'user'], isCore: false, category: 'media', description: 'Live TMDB movie catalog, HD trailers, and IMDb ratings' },
  { id: 'image-viewer', component: null as any, icon: Image, iconImage: ICO.camera, title: 'Image Studio', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'media', description: 'View, zoom, inspect EXIF, rotate, and export images' },
  { id: 'media-player', component: null as any, icon: Play, iconImage: ICO.play, title: 'Media Player', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'media', description: 'Local and streaming video & audio player' },
  { id: 'pdf-reader', component: null as any, icon: FileText, iconImage: ICO.pdf, title: 'PDF Reader', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'media', description: 'Read, annotate, and navigate PDF documents and books' },
  { id: 'screen-recorder', component: null as any, icon: Camera, iconImage: ICO.recorder, title: 'Screen Recorder', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'media', description: 'Capture screen, window, or microphone audio' },

  // Dedicated First-Class Standalone Third-Party Apps (Freeing the Power Browser)
  { id: 'figma', component: null as any, icon: Palette, iconImage: ICO.figma, title: 'Figma', roles: ['admin', 'filmmaker', 'designer', 'user'], isCore: false, category: 'creative', description: 'Collaborative UI/UX design studio in a native standalone window' },
  { id: 'youtube', component: null as any, icon: Play, iconImage: ICO.youtube, title: 'YouTube', roles: ['admin', 'filmmaker', 'technician', 'user'], isCore: false, category: 'media', description: 'YouTube video player and creator studio in a standalone window' },
];

// Dynamic import resolver — handles default and named exports
export async function resolveAppComponent(appId: string): Promise<React.ComponentType<any> | null> {
  const loader = appRegistry[appId];
  if (!loader) return null;
  const mod = await loader();
  if (mod.default) return mod.default;
  
  const variations = [
    appId,
    appId.charAt(0).toUpperCase() + appId.slice(1),
    appId.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(''),
    appId.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('') + 'App',
    'ScreenRecorderApp',
    'ProductivitySuite',
    'TerminalBox',
    'FileManager',
    'CodeEditor',
    'MediaViewer',
  ];
  for (const v of variations) {
    if (mod[v]) return mod[v];
  }
  const firstExport = Object.values(mod).find(v => typeof v === 'function');
  if (firstExport) return firstExport as React.ComponentType<any>;
  return null;
}

export function getManifestEntry(appId: string): AppManifestEntry | undefined {
  return APP_MANIFEST.find(a => a.id === appId);
}

export function getAppsForRole(role: string): AppManifestEntry[] {
  return APP_MANIFEST.filter(a => a.roles.includes(role));
}

export function getAppsByCategory(category: string): AppManifestEntry[] {
  return APP_MANIFEST.filter(a => a.category === category);
}

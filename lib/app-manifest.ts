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
};// SVG data URIs — vibrant high-resolution 3D vector app icons
const ICO = {
  // Terminal — Dark neon glass terminal with glowing green prompt
  terminal: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%230f172a'/%3E%3Cstop offset='100%25' stop-color='%23020617'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)' stroke='%23334155' stroke-width='2'/%3E%3Crect x='14' y='14' width='92' height='92' rx='20' fill='%23090d16' fill-opacity='.8' stroke='%231e293b' stroke-width='2'/%3E%3Cpath d='M32 44l22 16-22 16' stroke='%2310b981' stroke-width='7' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cline x1='60' y1='76' x2='88' y2='76' stroke='%2338bdf8' stroke-width='7' stroke-linecap='round'/%3E%3C/svg%3E",
  
  // Files — macOS Finder style glowing blue folder
  files: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%2338bdf8'/%3E%3Cstop offset='100%25' stop-color='%230284c7'/%3E%3C/linearGradient%3E%3ClinearGradient id='f' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%23ffffff'/%3E%3Cstop offset='100%25' stop-color='%23bae6fd'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Cpath d='M20 34c0-4.4 3.6-8 8-8h26l12 12h26c4.4 0 8 3.6 8 8v44c0 4.4-3.6 8-8 8H28c-4.4 0-8-3.6-8-8z' fill='url(%23f)'/%3E%3Cpath d='M20 48h80v42c0 4.4-3.6 8-8 8H28c-4.4 0-8-3.6-8-8z' fill='%23ffffff' opacity='.95'/%3E%3C/svg%3E",
  
  // Settings — Sleek metallic gear on silver gradient
  settings: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23f1f5f9'/%3E%3Cstop offset='100%25' stop-color='%2394a3b8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Ccircle cx='60' cy='60' r='28' stroke='%23334155' stroke-width='9' fill='none'/%3E%3Cg stroke='%23334155' stroke-width='8' stroke-linecap='round'%3E%3Cline x1='60' y1='18' x2='60' y2='32'/%3E%3Cline x1='60' y1='88' x2='60' y2='102'/%3E%3Cline x1='18' y1='60' x2='32' y2='60'/%3E%3Cline x1='88' y1='60' x2='102' y2='60'/%3E%3Cline x1='30' y1='30' x2='40' y2='40'/%3E%3Cline x1='80' y1='80' x2='90' y2='90'/%3E%3Cline x1='30' y1='90' x2='40' y2='80'/%3E%3Cline x1='80' y1='40' x2='90' y2='30'/%3E%3C/g%3E%3Ccircle cx='60' cy='60' r='10' fill='%230f172a'/%3E%3C/svg%3E",
  
  // App Store — Glowing purple gradient store badge
  store: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23c084fc'/%3E%3Cstop offset='100%25' stop-color='%236366f1'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Cpath d='M60 22L24 88h18l7-15h22l7 15h18zM54 60l6-14 6 14z' fill='%23ffffff'/%3E%3C/svg%3E",
  
  // Admin — Crimson 3D shield with golden emblem
  admin: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%23ef4444'/%3E%3Cstop offset='100%25' stop-color='%23991b1b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Cpath d='M60 20l36 16v28c0 24-36 40-36 40s-36-16-36-40V36z' fill='%23ffffff' fill-opacity='.2' stroke='%23ffffff' stroke-width='4'/%3E%3Cpath d='M44 60l12 12 24-24' stroke='%23ffffff' stroke-width='8' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E",
  
  // Moodboard — Vibrant orange canvas with color cards
  moodboard: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23fb923c'/%3E%3Cstop offset='100%25' stop-color='%23ea580c'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Crect x='20' y='20' width='36' height='32' rx='8' fill='%23ffffff'/%3E%3Crect x='64' y='20' width='36' height='32' rx='8' fill='%23fef08a'/%3E%3Crect x='20' y='60' width='36' height='40' rx='8' fill='%23e0e7ff'/%3E%3Crect x='64' y='60' width='36' height='40' rx='8' fill='%23ffffff' fill-opacity='.8'/%3E%3C/svg%3E",
  
  // Code Editor — VS Code official style cyan blue gradient
  code: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%230284c7'/%3E%3Cstop offset='100%25' stop-color='%230f172a'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Cpath d='M38 40L18 60l20 20' stroke='%2338bdf8' stroke-width='8' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M82 40l20 20-20 20' stroke='%2338bdf8' stroke-width='8' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cline x1='70' y1='32' x2='50' y2='88' stroke='%2338bdf8' stroke-width='6' stroke-linecap='round' opacity='.8'/%3E%3C/svg%3E",
  
  // Power Browser — Modern multi-color globe logo
  browser: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23ffffff'/%3E%3Cstop offset='100%25' stop-color='%23e2e8f0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Ccircle cx='60' cy='60' r='42' fill='none' stroke='%232563eb' stroke-width='8'/%3E%3Cpath d='M60 18a42 42 0 0 1 36.3 21H60' fill='%23ef4444'/%3E%3Cpath d='M96.3 39A42 42 0 0 1 78.8 96.3L60 60' fill='%2322c55e'/%3E%3Cpath d='M78.8 96.3A42 42 0 0 1 23.7 39L60 60' fill='%23eab308'/%3E%3Ccircle cx='60' cy='60' r='18' fill='%232563eb'/%3E%3Ccircle cx='60' cy='60' r='12' fill='%23ffffff'/%3E%3C/svg%3E",
  
  // Campaign Lab — Dark obsidian notebook with glowing emerald seal
  campaign: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%2318181b'/%3E%3Cstop offset='100%25' stop-color='%2309090b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)' stroke='%2327272a' stroke-width='2'/%3E%3Cpath d='M30 90V30l30-12 30 12v60l-30 12z' fill='%23ffffff' fill-opacity='.9'/%3E%3Cpath d='M30 30l30 12 30-12' fill='none' stroke='%2318181b' stroke-width='4'/%3E%3Cline x1='60' y1='42' x2='60' y2='102' stroke='%2318181b' stroke-width='4'/%3E%3C/svg%3E",
  
  // Productivity Suite — Google Workspace multi-color tiles
  productivity: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='28' fill='%23ffffff'/%3E%3Crect x='22' y='22' width='34' height='34' rx='10' fill='%233b82f6'/%3E%3Crect x='64' y='22' width='34' height='34' rx='10' fill='%23ef4444'/%3E%3Crect x='22' y='64' width='34' height='34' rx='10' fill='%2322c55e'/%3E%3Crect x='64' y='64' width='34' height='34' rx='10' fill='%23eab308'/%3E%3C/svg%3E",
  
  // Proposal Generator — Deep royal blue doc logo
  proposal: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%231d4ed8'/%3E%3Cstop offset='100%25' stop-color='%231e40af'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Crect x='28' y='20' width='64' height='80' rx='8' fill='%23ffffff'/%3E%3Cline x1='40' y1='36' x2='80' y2='36' stroke='%2394a3b8' stroke-width='5' stroke-linecap='round'/%3E%3Cline x1='40' y1='52' x2='80' y2='52' stroke='%2394a3b8' stroke-width='5' stroke-linecap='round'/%3E%3Cline x1='40' y1='68' x2='64' y2='68' stroke='%2394a3b8' stroke-width='5' stroke-linecap='round'/%3E%3C/svg%3E",
  
  // Side Gigs — Professional sapphire briefcase
  briefcase: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%230284c7'/%3E%3Cstop offset='100%25' stop-color='%230369a1'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Crect x='20' y='40' width='80' height='56' rx='12' fill='%23ffffff'/%3E%3Cpath d='M44 40V28a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v12' fill='none' stroke='%23ffffff' stroke-width='6'/%3E%3Crect x='52' y='58' width='16' height='14' rx='4' fill='%230284c7'/%3E%3C/svg%3E",
  
  // Phone — Emerald WhatsApp green phone bubble
  phone: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%2322c55e'/%3E%3Cstop offset='100%25' stop-color='%2315803d'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Cpath d='M40 32c-4 0-7 3-8 7-3 10 3 26 16 39s29 19 39 16c4-1 7-4 7-8l-3-10c-1-3-4-4-7-3l-12 5c-2 1-3 1-4 0L49 57c-1-1-1-2 0-4l5-12c1-3 0-6-3-7l-10-2' fill='%23ffffff'/%3E%3C/svg%3E",
  
  // Media Player — YouTube crimson play icon
  play: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23dc2626'/%3E%3Cstop offset='100%25' stop-color='%23991b1b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Cpolygon points='44,28 44,92 94,60' fill='%23ffffff'/%3E%3C/svg%3E",
  
  // PDF Reader — Adobe Acrobat red reader icon
  pdf: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23ef4444'/%3E%3Cstop offset='100%25' stop-color='%23b91c1c'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Crect x='28' y='20' width='64' height='80' rx='8' fill='%23ffffff'/%3E%3Ctext x='60' y='68' text-anchor='middle' font-size='22' font-weight='900' fill='%23dc2626' font-family='system-ui'%3EPDF%3C/text%3E%3C/svg%3E",
  
  // Screen Recorder — OBS Dark with red dot
  recorder: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='28' fill='%2318181b'/%3E%3Ccircle cx='60' cy='54' r='26' stroke='%23ffffff' stroke-width='6' fill='none'/%3E%3Ccircle cx='60' cy='54' r='12' fill='%23ef4444'/%3E%3Crect x='36' y='88' width='48' height='8' rx='4' fill='%233f3f46'/%3E%3C/svg%3E",
  
  // Movie Browser — Netflix N icon on dark
  film: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='28' fill='%23000000'/%3E%3Cpath d='M34 94V26l26 36 26-36v68' stroke='%23e50914' stroke-width='10' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E",
  
  // Book — Apple Books purple gradient
  book: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23ec4899'/%3E%3Cstop offset='100%25' stop-color='%23a855f7'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Cpath d='M28 32h28c6 0 6 6 6 6v52s0-6-6-6H28z' fill='%23ffffff' opacity='.9'/%3E%3Cpath d='M92 32H64c-6 0-6 6-6 6v52s0-6 6-6h28z' fill='%23ffffff'/%3E%3C/svg%3E",
  
  // Camera — Instagram gradient camera tile
  camera: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='1' x2='1' y2='0'%3E%3Cstop offset='0%25' stop-color='%23facc15'/%3E%3Cstop offset='30%25' stop-color='%23fb923c'/%3E%3Cstop offset='60%25' stop-color='%23ec4899'/%3E%3Cstop offset='100%25' stop-color='%238b5cf6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Crect x='22' y='22' width='76' height='76' rx='22' stroke='%23ffffff' stroke-width='6' fill='none'/%3E%3Ccircle cx='60' cy='60' r='22' stroke='%23ffffff' stroke-width='6' fill='none'/%3E%3Ccircle cx='86' cy='34' r='6' fill='%23ffffff'/%3E%3C/svg%3E",
  
  // AI Assistant — Google Gemini glowing 3D starburst
  gemini: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%2318181b'/%3E%3Cstop offset='100%25' stop-color='%2309090b'/%3E%3C/linearGradient%3E%3ClinearGradient id='star' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%2338bdf8'/%3E%3Cstop offset='50%25' stop-color='%23c084fc'/%3E%3Cstop offset='100%25' stop-color='%23f43f5e'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)' stroke='%2327272a' stroke-width='2'/%3E%3Cpath d='M60 16c0 24.3 19.7 44 44 44-24.3 0-44 19.7-44 44 0-24.3-19.7-44-44-44 24.3 0 44-19.7 44-44z' fill='url(%23star)'/%3E%3C/svg%3E",
  
  // Spotify — Green icon with bold black audio waves
  spotify: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='28' fill='%231ed760'/%3E%3Cpath d='M30 42c24-8 48-5 64 5M34 60c20-6 40-4 52 4M38 78c16-4 30-2 40 4' stroke='%23000000' stroke-width='9' fill='none' stroke-linecap='round'/%3E%3C/svg%3E",
  
  // Bookmark — 3D Ribbon / Floating Bookmark Badge (Pinterest reference)
  bookmark: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%2338bdf8'/%3E%3Cstop offset='50%25' stop-color='%23818cf8'/%3E%3Cstop offset='100%25' stop-color='%23c084fc'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23bg)'/%3E%3Cpath d='M36 22h48a6 6 0 0 1 6 6v70l-30-18-30 18V28a6 6 0 0 1 6-6z' fill='%23ffffff'/%3E%3Ccircle cx='60' cy='44' r='8' fill='%236366f1'/%3E%3C/svg%3E",
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

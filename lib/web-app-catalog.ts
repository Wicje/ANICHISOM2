import type React from 'react';
import { Sparkles, Code, Music, Target, MessageSquare, Palette } from 'lucide-react';

export interface WebAppCatalogItem {
  id: string;
  name: string;
  category: 'productivity' | 'design' | 'developer' | 'media';
  icon: React.ComponentType<any>;
  iconImage?: string;
  description: string;
  url: string;
  installed: boolean;
  rating: number;
}

// Curated third-party web apps shown in the App Store and installable into the OS.
// Apps that can't be iframed natively (Notion, Figma, GitHub...) render through
// the Continua extension in-OS, or show an install-guide screen without it.
export const WEB_APP_CATALOG: WebAppCatalogItem[] = [
  {
    id: 'figma',
    name: 'Figma Design System',
    category: 'design',
    icon: Palette,
    iconImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%231e1e1e'/%3E%3Cpath d='M40 30a15 15 0 0 0 0 30h15V30H40z' fill='%23f24e1e'/%3E%3Ccircle cx='70' cy='45' r='15' fill='%23ff7262'/%3E%3Ccircle cx='70' cy='75' r='15' fill='%231abcfe'/%3E%3Cpath d='M40 60a15 15 0 0 0 0 30 15 15 0 0 0 15-15V60H40z' fill='%23a259ff'/%3E%3Ccircle cx='40' cy='75' r='15' fill='%230acf83'/%3E%3C/svg%3E",
    description: 'Collaborative interface design tool & canvas embedder',
    url: 'https://www.figma.com',
    installed: true,
    rating: 4.9,
  },
  {
    id: 'github',
    name: 'GitHub Desktop & Codespaces',
    category: 'developer',
    icon: Code,
    iconImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%23181717'/%3E%3Cpath d='M60 25C40.7 25 25 40.7 25 60c0 15.5 10 28.6 24 33.3 1.8.3 2.4-.8 2.4-1.7v-6.2c-9.7 2.1-11.8-4.7-11.8-4.7-1.6-4.1-3.9-5.2-3.9-5.2-3.2-2.2.2-2.1.2-2.1 3.5.2 5.4 3.6 5.4 3.6 3.1 5.4 8.2 3.8 10.2 2.9.3-2.3 1.2-3.8 2.2-4.7-7.8-.9-15.9-3.9-15.9-17.3 0-3.8 1.4-6.9 3.6-9.3-.4-1-.1-4.4.4-9.2 0 0 2.9-.9 9.6 3.6a33.3 33.3 0 0 1 17.5 0c6.7-4.5 9.6-3.6 9.6-3.6.5 4.8.2 8.2-.3 9.2 2.3 2.4 3.6 5.5 3.6 9.3 0 13.5-8.1 16.4-15.9 17.3 1.3 1.1 2.4 3.3 2.4 6.7v10c0 1 .6 2 2.4 1.7C85 88.6 95 75.5 95 60c0-19.3-15.7-35-35-35z' fill='%23fff'/%3E%3C/svg%3E",
    description: 'Code repositories, issues, and automated Virtual FS cloning',
    url: 'https://github.com',
    installed: true,
    rating: 4.9,
  },
  {
    id: 'notion',
    name: 'Notion Workspace',
    category: 'productivity',
    icon: Sparkles,
    iconImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%23000'/%3E%3Cpath d='M35 80V40l25-10 25 10v40l-25 10z' fill='%23fff' opacity='.9'/%3E%3Cpath d='M35 40l25 10 25-10' fill='none' stroke='%23fff' stroke-width='2'/%3E%3Cline x1='60' y1='50' x2='60' y2='80' stroke='%23000' stroke-width='2'/%3E%3C/svg%3E",
    description: 'All-in-one workspace for notes, docs, and team wikis',
    url: 'https://www.notion.so',
    installed: true,
    rating: 4.8,
  },
  {
    id: 'spotify',
    name: 'Spotify Music Player',
    category: 'media',
    icon: Music,
    iconImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%231db954'/%3E%3Cpath d='M34 46c20-6 40-4 54 4M38 62c16-5 32-3 44 3M42 76c12-3 24-1 32 3' stroke='%23000' stroke-width='7' fill='none' stroke-linecap='round'/%3E%3C/svg%3E",
    description: 'Digital music service and audio streaming embedded in Notch',
    url: 'https://open.spotify.com',
    installed: true,
    rating: 4.9,
  },
  {
    id: 'vscode',
    name: 'VS Code Web',
    category: 'developer',
    icon: Code,
    iconImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%23007acc'/%3E%3Cpath d='M40 42L24 60l16 18' stroke='%23fff' stroke-width='6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M80 42l16 18-16 18' stroke='%23fff' stroke-width='6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cline x1='68' y1='36' x2='52' y2='84' stroke='%23fff' stroke-width='4' stroke-linecap='round' opacity='.6'/%3E%3C/svg%3E",
    description: 'Full web version of Visual Studio Code IDE',
    url: 'https://vscode.dev',
    installed: false,
    rating: 4.9,
  },
  {
    id: 'canva',
    name: 'Canva Design Studio',
    category: 'design',
    icon: Sparkles,
    iconImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%2300c4cc'/%3E%3Cstop offset='100%25' stop-color='%237d2ae8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='26' fill='url(%23a)'/%3E%3Ctext x='60' y='72' text-anchor='middle' font-size='48' font-weight='800' fill='%23fff' font-family='serif'%3ECanva%3C/text%3E%3C/svg%3E",
    description: 'Graphic design, presentation, and video creator',
    url: 'https://www.canva.com',
    installed: false,
    rating: 4.7,
  },
  {
    id: 'linear',
    name: 'Linear Issue Tracker',
    category: 'productivity',
    icon: Target,
    iconImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%235e6ad2'/%3E%3Ccircle cx='60' cy='60' r='24' stroke='%23fff' stroke-width='6' fill='none'/%3E%3Ccircle cx='60' cy='60' r='10' fill='%23fff'/%3E%3C/svg%3E",
    description: 'Streamlined issue tracking for software teams',
    url: 'https://linear.app',
    installed: false,
    rating: 4.9,
  },
  {
    id: 'slack',
    name: 'Slack Workspaces',
    category: 'productivity',
    icon: MessageSquare,
    iconImage: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='26' fill='%23611f69'/%3E%3Ccircle cx='42' cy='45' r='14' fill='%2336c5f0'/%3E%3Ccircle cx='78' cy='45' r='14' fill='%232eb67d'/%3E%3Ccircle cx='42' cy='78' r='14' fill='%23ecb22e'/%3E%3Ccircle cx='78' cy='78' r='14' fill='%23e01e5a'/%3E%3C/svg%3E",
    description: 'Team messaging and real-time collaboration channel',
    url: 'https://slack.com',
    installed: false,
    rating: 4.6,
  },
];

import { Block, Page } from './types';
import { Type, Heading1, Heading2, Heading3, CheckSquare, List, Image as ImageIcon, Database, Code, FileText, ListOrdered, ChevronRight, Table, Quote, Minus, Link, Info, LayoutDashboard, Calendar, LayoutList, Image as GalleryIcon, GitCommit, FileUp, Video, Headphones, Globe, Brain, FormInput, MousePointerClick, LayoutTemplate, RefreshCw, ListTree, Sigma, MessageSquare, PaintBucket, Palette } from 'lucide-react';

export const DEFAULT_BLOCKS: Block[] = [
  { id: 'b1', type: 'h1', content: 'Core Narrative' },
  { id: 'b2', type: 'p', content: 'We are here to rewrite the physics of the market.' },
  { id: 'b3', type: 'p', content: 'The new product line doesn\'t iterate, it obliterates.' },
  { id: 'b4', type: 'todo', content: 'Finalize brand assets', checked: false },
  { id: 'b5', type: 'todo', content: 'Send deck to leadership', checked: true }
];

export const DEFAULT_PAGES: Page[] = [
  {
    id: '1',
    parentId: null,
    title: 'Brand Strategy Q4',
    icon: '🎯',
    expanded: true,
    blocks: DEFAULT_BLOCKS,
    updatedAt: Date.now(),
  },
  {
    id: '2',
    parentId: '1',
    title: 'Design Sync',
    icon: '📝',
    blocks: [
      { id: 'c1', type: 'bullet', content: 'Discussed new moodboard direction' },
      { id: 'c2', type: 'bullet', content: 'Alignment on brutalist themes' },
      { id: 'c3', type: 'database', content: '' }
    ],
    updatedAt: Date.now() - 100000,
  }
];

export const SLASH_COMMANDS = [
  // Basic Blocks
  { id: 'p', label: 'Text', icon: Type },
  { id: 'page', label: 'Page', icon: FileText },
  { id: 'todo', label: 'To-do List', icon: CheckSquare },
  { id: 'bullet', label: 'Bulleted List', icon: List },
  { id: 'num', label: 'Numbered List', icon: ListOrdered },
  { id: 'toggle', label: 'Toggle List', icon: ChevronRight },
  { id: 'h1', label: 'Heading 1', icon: Heading1 },
  { id: 'h2', label: 'Heading 2', icon: Heading2 },
  { id: 'h3', label: 'Heading 3', icon: Heading3 },
  { id: 'table', label: 'Table', icon: Table },
  { id: 'quote', label: 'Quote', icon: Quote },
  { id: 'divider', label: 'Divider', icon: Minus },
  { id: 'link', label: 'Link to Page', icon: Link },
  { id: 'callout', label: 'Callout', icon: Info },
  
  // Database Views
  { id: 'database', label: 'Table View', icon: Table },
  { id: 'board', label: 'Board View', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendar View', icon: Calendar },
  { id: 'list', label: 'List View', icon: LayoutList },
  { id: 'gallery', label: 'Gallery View', icon: GalleryIcon },
  { id: 'timeline', label: 'Timeline View', icon: GitCommit },
  { id: 'linked', label: 'Linked View of Database', icon: Link },

  // Media & Files
  { id: 'image', label: 'Image', icon: ImageIcon },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'audio', label: 'Audio', icon: Headphones },
  { id: 'file', label: 'File', icon: FileUp },
  { id: 'code', label: 'Code', icon: Code },
  { id: 'web', label: 'Web Bookmark', icon: Globe },

  // Advanced & Inline
  { id: 'action-ai', label: 'Ask AI', icon: Brain },
  { id: 'form', label: 'Form', icon: FormInput },
  { id: 'button', label: 'Button', icon: MousePointerClick },
  { id: 'template', label: 'Template Button', icon: LayoutTemplate },
  { id: 'synced', label: 'Synced Block', icon: RefreshCw },
  { id: 'toc', label: 'Table of Contents', icon: ListTree },
  { id: 'math', label: 'Math Equation', icon: Sigma },
  { id: 'comment', label: 'Comment', icon: MessageSquare },

  // Design & Transform
  { id: 'turn', label: 'Turn into...', icon: PaintBucket },
  { id: 'color', label: 'Color', icon: Palette },
];

export const TEAM_MEMBERS = ['@Founder', '@CreativeDir', '@Designer', '@Developer', '@Filmmaker', '@Copywriter', '@DataRecovery'];

export const TEMPLATES = [
  { 
    name: 'ANICHISOM Campaign', 
    icon: '✨',
    pages: [
      { title: 'Discovery & Brief', icon: '📝', blocks: [{ id: 't1', type: 'h1', content: 'Client Brief' }] },
      { title: 'Moodboard & Visuals', icon: '🎨', blocks: [{ id: 't2', type: 'h1', content: 'Art Direction' }] },
      { title: 'Deliverables', icon: '📦', blocks: [{ id: 't3', type: 'database', content: '' }] }
    ] 
  },
  { 
    name: 'Clothing Drop', 
    icon: '👕',
    pages: [
      { title: 'Collection Planner', icon: '📅', blocks: [{ id: 't4', type: 'h1', content: 'Season Concept' }] },
      { title: 'Supplier Contacts', icon: '🏭', blocks: [{ id: 't5', type: 'database', content: '' }] },
      { title: 'Lookbook', icon: '📸', blocks: [{ id: 't6', type: 'image', content: '' }] }
    ] 
  },
  { 
    name: 'Hardware Iteration', 
    icon: '⚙️',
    pages: [
      { title: 'BOM Tracker', icon: '📋', blocks: [{ id: 't7', type: 'database', content: '' }] },
      { title: 'Firmware Specs', icon: '💻', blocks: [{ id: 't8', type: 'h1', content: 'v2.0 Logic' }] }
    ] 
  }
];

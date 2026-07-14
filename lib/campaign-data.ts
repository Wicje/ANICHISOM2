import {
  Block, Page, DatabaseSchema, DatabaseProperty, DatabaseRow, SelectOption,
  DatabaseViewConfig, BlockType, PageLevel
} from '@/lib/campaign-types';
import { generateId } from '@/lib/utils';
import {
  Type, Heading1, Heading2, Heading3, CheckSquare, List, Image as ImageIcon,
  Database, Code, FileText, ListOrdered, ChevronRight, Table, Quote, Minus,
  Link, Info, LayoutDashboard, Calendar, LayoutList, Image as GalleryIcon,
  GitCommit, FileUp, Video, Headphones, Globe, Brain, FormInput,
  MousePointerClick, LayoutTemplate, RefreshCw, ListTree, Sigma,
  MessageSquare, PaintBucket, Palette
} from 'lucide-react';

// ─── Cover Gradient Presets ─────────────────────────────────
export const COVER_GRADIENTS = [
  'from-blue-500 to-purple-600',
  'from-emerald-400 to-teal-600',
  'from-amber-400 to-orange-600',
  'from-pink-400 to-rose-600',
  'from-indigo-400 to-blue-600',
  'from-violet-400 to-purple-600',
  'from-cyan-400 to-sky-600',
  'from-fuchsia-400 to-pink-600',
  'from-lime-400 to-green-600',
  'from-red-400 to-rose-600',
  'from-slate-400 to-gray-600',
  'from-yellow-400 to-amber-600',
];

// ─── Select Color Palette ───────────────────────────────────
const SELECT_COLORS: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  purple: 'bg-purple-100 text-purple-700',
  pink: 'bg-pink-100 text-pink-700',
  slate: 'bg-slate-100 text-slate-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  lime: 'bg-lime-100 text-lime-700',
};

export { SELECT_COLORS };

// ─── Default Database Schemas ────────────────────────────────
export const DEFAULT_DATABASES: DatabaseSchema[] = [
  {
    id: 'db-deliverables',
    name: 'Deliverables',
    icon: '📦',
    properties: [
      { id: 'prop-name', name: 'Name', type: 'text' },
      { id: 'prop-status', name: 'Status', type: 'select', options: [
        { id: 's-not-started', name: 'Not Started', color: 'slate' },
        { id: 's-in-progress', name: 'In Progress', color: 'blue' },
        { id: 's-review', name: 'In Review', color: 'amber' },
        { id: 's-done', name: 'Done', color: 'green' },
        { id: 's-blocked', name: 'Blocked', color: 'red' },
      ] },
      { id: 'prop-priority', name: 'Priority', type: 'select', options: [
        { id: 'p-low', name: 'Low', color: 'slate' },
        { id: 'p-medium', name: 'Medium', color: 'blue' },
        { id: 'p-high', name: 'High', color: 'amber' },
        { id: 'p-urgent', name: 'Urgent', color: 'red' },
      ] },
      { id: 'prop-date', name: 'Due Date', type: 'date' },
      { id: 'prop-assignee', name: 'Assignee', type: 'person' },
      { id: 'prop-url', name: 'Link', type: 'url' },
      { id: 'prop-checkbox', name: 'Approved', type: 'checkbox' },
      { id: 'prop-created', name: 'Created', type: 'created-time' },
    ],
    rows: [
      { id: 'row-1', properties: { 'prop-name': 'Draft Launch Email', 'prop-status': 's-in-progress', 'prop-priority': 'p-high', 'prop-date': '2024-10-24', 'prop-assignee': '@Copywriter', 'prop-checkbox': false } },
      { id: 'row-2', properties: { 'prop-name': 'Design Assets Pack', 'prop-status': 's-not-started', 'prop-priority': 'p-medium', 'prop-date': '2024-10-26', 'prop-assignee': '@Designer', 'prop-checkbox': false } },
      { id: 'row-3', properties: { 'prop-name': 'Approve Budget', 'prop-status': 's-done', 'prop-priority': 'p-urgent', 'prop-date': '2024-10-20', 'prop-assignee': '@Founder', 'prop-checkbox': true } },
      { id: 'row-4', properties: { 'prop-name': 'Social Media Plan', 'prop-status': 's-review', 'prop-priority': 'p-medium', 'prop-date': '2024-10-28', 'prop-assignee': '@CreativeDir', 'prop-checkbox': false } },
      { id: 'row-5', properties: { 'prop-name': 'Film Promo Video', 'prop-status': 's-blocked', 'prop-priority': 'p-high', 'prop-date': '2024-11-01', 'prop-assignee': '@Filmmaker', 'prop-checkbox': false } },
    ],
  },
  {
    id: 'db-suppliers',
    name: 'Supplier Contacts',
    icon: '🏭',
    properties: [
      { id: 'sup-name', name: 'Company', type: 'text' },
      { id: 'sup-contact', name: 'Contact Person', type: 'text' },
      { id: 'sup-email', name: 'Email', type: 'email' },
      { id: 'sup-phone', name: 'Phone', type: 'phone' },
      { id: 'sup-category', name: 'Category', type: 'select', options: [
        { id: 'cat-fabric', name: 'Fabric', color: 'purple' },
        { id: 'cat-printing', name: 'Printing', color: 'blue' },
        { id: 'cat-hardware', name: 'Hardware', color: 'amber' },
        { id: 'cat-packaging', name: 'Packaging', color: 'green' },
      ] },
      { id: 'sup-status', name: 'Status', type: 'select', options: [
        { id: 'sup-active', name: 'Active', color: 'green' },
        { id: 'sup-pending', name: 'Pending', color: 'amber' },
        { id: 'sup-inactive', name: 'Inactive', color: 'slate' },
      ] },
      { id: 'sup-rating', name: 'Rating', type: 'number' },
    ],
    rows: [
      { id: 'sup-row-1', properties: { 'sup-name': 'Apex Textiles', 'sup-contact': 'Jane Doe', 'sup-email': 'jane@apex.com', 'sup-category': 'cat-fabric', 'sup-status': 'sup-active', 'sup-rating': 4.5 } },
      { id: 'sup-row-2', properties: { 'sup-contact': 'Bob Smith', 'sup-name': 'PrintMaster Co', 'sup-email': 'bob@printmaster.com', 'sup-category': 'cat-printing', 'sup-status': 'sup-active', 'sup-rating': 3.8 } },
    ],
  },
  {
    id: 'db-bom',
    name: 'BOM Tracker',
    icon: '📋',
    properties: [
      { id: 'bom-part', name: 'Part Name', type: 'text' },
      { id: 'bom-qty', name: 'Quantity', type: 'number' },
      { id: 'bom-cost', name: 'Unit Cost ($)', type: 'number' },
      { id: 'bom-source', name: 'Source', type: 'select', options: [
        { id: 'src-domestic', name: 'Domestic', color: 'blue' },
        { id: 'src-import', name: 'Import', color: 'amber' },
        { id: 'src-custom', name: 'Custom', color: 'purple' },
      ] },
      { id: 'bom-lead', name: 'Lead Time (days)', type: 'number' },
      { id: 'bom-status', name: 'Status', type: 'select', options: [
        { id: 'bom-ordered', name: 'Ordered', color: 'blue' },
        { id: 'bom-received', name: 'Received', color: 'green' },
        { id: 'bom-pending', name: 'Pending Order', color: 'slate' },
      ] },
    ],
    rows: [
      { id: 'bom-row-1', properties: { 'bom-part': 'MCU Board v2', 'bom-qty': 50, 'bom-cost': 12.50, 'bom-source': 'src-import', 'bom-lead': 14, 'bom-status': 'bom-ordered' } },
      { id: 'bom-row-2', properties: { 'bom-part': 'Custom Enclosure', 'bom-qty': 50, 'bom-cost': 8.00, 'bom-source': 'src-custom', 'bom-lead': 21, 'bom-status': 'bom-pending' } },
    ],
  },
];

// ─── Default Pages ──────────────────────────────────────────
export const DEFAULT_PAGES: Page[] = [
  {
    id: '1',
    parentId: null,
    title: 'Brand Strategy Q4',
    icon: '🎯',
    coverGradient: 'from-blue-500 to-purple-600',
    expanded: true,
    level: 'campaign',
    campaignId: '1',
    sortOrder: 0,
    blocks: [
      { id: 'b1', type: 'h1', content: 'Core Narrative' },
      { id: 'b2', type: 'p', content: 'We are here to rewrite the physics of the market.' },
      { id: 'b3', type: 'p', content: 'The new product line doesn\'t iterate — it obliterates.' },
      { id: 'b4', type: 'todo', content: 'Finalize brand assets', checked: false },
      { id: 'b5', type: 'todo', content: 'Send deck to leadership', checked: true },
      { id: 'b6', type: 'database', content: '', databaseId: 'db-deliverables', databaseViewConfig: { viewType: 'table', filters: [], sorts: [{ propertyId: 'prop-priority', direction: 'descending' }], hiddenProperties: [] } },
    ],
    updatedAt: Date.now(),
    createdAt: Date.now() - 200000,
    favorite: true,
  },
  {
    id: '2',
    parentId: '1',
    title: 'Design Sync',
    icon: '📝',
    level: 'phase',
    campaignId: '1',
    sortOrder: 0,
    blocks: [
      { id: 'c1', type: 'bullet', content: 'Discussed new moodboard direction' },
      { id: 'c2', type: 'bullet', content: 'Alignment on brutalist themes' },
      { id: 'c3', type: 'database', content: '', databaseId: 'db-deliverables', databaseViewConfig: { viewType: 'board', filters: [{ propertyId: 'prop-status', operator: 'is-not', value: 's-done' }], sorts: [], hiddenProperties: ['prop-created'], boardGroupProperty: 'prop-status' } },
    ],
    updatedAt: Date.now() - 100000,
    createdAt: Date.now() - 150000,
  },
  {
    id: '3',
    parentId: '2',
    title: 'Finalize Launch Email',
    icon: '✉️',
    level: 'task',
    campaignId: '1',
    sortOrder: 0,
    status: 'in-progress',
    assignee: '@Copywriter',
    dueDate: '2024-10-24',
    blocks: [
      { id: 'd1', type: 'h2', content: 'Email Draft' },
      { id: 'd2', type: 'p', content: 'Subject: The future of the market starts today.' },
      { id: 'd3', type: 'todo', content: 'Review tone', checked: true },
      { id: 'd4', type: 'todo', content: 'Add CTA button', checked: false },
    ],
    updatedAt: Date.now() - 50000,
    createdAt: Date.now() - 80000,
  },
];

// ─── Slash Commands ─────────────────────────────────────────
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

// ─── Team Members ───────────────────────────────────────────
export const TEAM_MEMBERS = ['@Founder', '@CreativeDir', '@Designer', '@Developer', '@Filmmaker', '@Copywriter', '@DataRecovery'];

// ─── Templates ──────────────────────────────────────────────
export const TEMPLATES = [
  {
    name: 'ANICHISOM Campaign',
    icon: '✨',
    coverGradient: 'from-blue-500 to-purple-600',
    description: 'Full campaign workflow from brief to delivery',
    hierarchy: true as const,
    pages: [
      { title: 'Discovery & Brief', icon: '📝', level: 'phase' as PageLevel, blocks: [
        { id: 't1', type: 'h1', content: 'Client Brief' },
        { id: 't1a', type: 'callout', content: 'Key insight from client meeting', icon: '💡' },
        { id: 't1b', type: 'p', content: '' },
      ] },
      { title: 'Moodboard & Visuals', icon: '🎨', level: 'phase' as PageLevel, blocks: [
        { id: 't2', type: 'h1', content: 'Art Direction' },
      ] },
      { title: 'Deliverables', icon: '📦', level: 'phase' as PageLevel, blocks: [
        { id: 't3', type: 'database', content: '', databaseId: 'db-deliverables' },
      ] },
      { title: 'Supplier Contacts', icon: '🏭', level: 'phase' as PageLevel, blocks: [
        { id: 't4', type: 'database', content: '', databaseId: 'db-suppliers' },
      ] },
    ],
    databases: ['db-deliverables', 'db-suppliers'],
  },
  {
    name: 'Clothing Drop',
    icon: '👕',
    coverGradient: 'from-emerald-400 to-teal-600',
    description: 'Collection planning, suppliers, and lookbook',
    hierarchy: true as const,
    pages: [
      { title: 'Collection Planner', icon: '📅', level: 'phase' as PageLevel, blocks: [
        { id: 't5', type: 'h1', content: 'Season Concept' },
        { id: 't5a', type: 'database', content: '', databaseId: 'db-deliverables', databaseViewConfig: { viewType: 'board', filters: [], sorts: [], hiddenProperties: [], boardGroupProperty: 'prop-status' } },
      ] },
      { title: 'Supplier Contacts', icon: '🏭', level: 'phase' as PageLevel, blocks: [
        { id: 't6', type: 'database', content: '', databaseId: 'db-suppliers' },
      ] },
      { title: 'Lookbook', icon: '📸', level: 'phase' as PageLevel, blocks: [
        { id: 't7', type: 'h2', content: 'Gallery View' },
        { id: 't7a', type: 'gallery', content: '', databaseId: 'db-deliverables', databaseViewConfig: { viewType: 'gallery', filters: [], sorts: [], hiddenProperties: [], cardPreviewProperty: 'prop-name' } },
      ] },
    ],
    databases: ['db-deliverables', 'db-suppliers'],
  },
  {
    name: 'Hardware Iteration',
    icon: '⚙️',
    coverGradient: 'from-amber-400 to-orange-600',
    description: 'BOM tracking, firmware specs, and iteration log',
    hierarchy: true as const,
    pages: [
      { title: 'BOM Tracker', icon: '📋', level: 'phase' as PageLevel, blocks: [
        { id: 't8', type: 'database', content: '', databaseId: 'db-bom' },
      ] },
      { title: 'Firmware Specs', icon: '💻', level: 'phase' as PageLevel, blocks: [
        { id: 't9', type: 'h1', content: 'v2.0 Logic' },
        { id: 't9a', type: 'code', content: '// Entry point\nvoid main() {\n  init_hardware();\n  run_loop();\n}', language: 'c' },
      ] },
      { title: 'Iteration Timeline', icon: '📈', level: 'phase' as PageLevel, blocks: [
        { id: 't10', type: 'timeline', content: '', databaseId: 'db-bom', databaseViewConfig: { viewType: 'timeline', filters: [], sorts: [{ propertyId: 'bom-lead', direction: 'ascending' }], hiddenProperties: [] } },
      ] },
    ],
    databases: ['db-bom'],
  },
  {
    name: 'Creative Brief',
    icon: '💡',
    coverGradient: 'from-pink-400 to-rose-600',
    description: 'Lightweight brief with to-dos and notes',
    hierarchy: false as const,
    pages: [
      { title: 'Brief Notes', icon: '📝', level: 'phase' as PageLevel, blocks: [
        { id: 't11', type: 'h1', content: 'Creative Brief' },
        { id: 't11a', type: 'callout', content: 'Target audience: 18-35, design-conscious, values authenticity', icon: '🎯' },
        { id: 't11b', type: 'p', content: '' },
      ] },
      { title: 'Tasks', icon: '✅', level: 'phase' as PageLevel, blocks: [
        { id: 't12', type: 'todo', content: 'Research competitors', checked: false },
        { id: 't12a', type: 'todo', content: 'Define tone of voice', checked: false },
        { id: 't12b', type: 'todo', content: 'Create initial mockups', checked: false },
      ] },
    ],
    databases: [],
  },
  {
    name: 'Meeting Notes',
    icon: '📅',
    coverGradient: 'from-indigo-400 to-blue-600',
    description: 'Structured meeting notes with action items',
    hierarchy: false as const,
    pages: [
      { title: 'Meeting Notes', icon: '📋', level: 'phase' as PageLevel, blocks: [
        { id: 't13', type: 'h1', content: 'Meeting Notes' },
        { id: 't13a', type: 'callout', content: 'Date: Today | Attendees: @Founder, @CreativeDir', icon: '📅' },
        { id: 't13b', type: 'h2', content: 'Discussion Points' },
        { id: 't13c', type: 'bullet', content: '' },
        { id: 't13d', type: 'h2', content: 'Action Items' },
        { id: 't13e', type: 'todo', content: '' },
      ] },
    ],
    databases: [],
  },
  {
    name: 'Video Production',
    icon: '🎬',
    coverGradient: 'from-red-400 to-rose-600',
    description: 'Pre-production, shoot days, post-production pipeline',
    hierarchy: true as const,
    pages: [
      { title: 'Pre-Production', icon: '📋', level: 'phase' as PageLevel, blocks: [
        { id: 'vp1', type: 'h1', content: 'Pre-Production' },
        { id: 'vp1a', type: 'callout', content: 'Storyboard, shot list, talent booking, location scouting', icon: '🎬' },
        { id: 'vp1b', type: 'database', content: '', databaseId: 'db-deliverables', databaseViewConfig: { viewType: 'board', filters: [{ propertyId: 'prop-status', operator: 'is-not', value: 's-done' }], sorts: [], hiddenProperties: ['prop-created'], boardGroupProperty: 'prop-status' } },
      ] },
      { title: 'Shoot Day 1', icon: '🎥', level: 'task' as PageLevel, blocks: [
        { id: 'vp2', type: 'h1', content: 'Shoot Day' },
        { id: 'vp2a', type: 'callout', content: 'Location: Studio A | Time: 9AM-6PM | Crew call: 8AM', icon: '📍' },
        { id: 'vp2b', type: 'h2', content: 'Shot List' },
        { id: 'vp2c', type: 'todo', content: 'Wide establishing shot', checked: false },
        { id: 'vp2d', type: 'todo', content: 'Product close-ups', checked: false },
        { id: 'vp2e', type: 'todo', content: 'Hero shots with talent', checked: false },
      ] },
      { title: 'Post-Production', icon: '✂️', level: 'phase' as PageLevel, blocks: [
        { id: 'vp3', type: 'h1', content: 'Post-Production' },
        { id: 'vp3a', type: 'p', content: 'Edit, color grade, sound design, final export.' },
        { id: 'vp3b', type: 'database', content: '', databaseId: 'db-deliverables' },
      ] },
    ],
    databases: ['db-deliverables'],
  },
  {
    name: 'Photo Shoot',
    icon: '📸',
    coverGradient: 'from-cyan-400 to-sky-600',
    description: 'Mood board, shot list, and gallery delivery',
    hierarchy: true as const,
    pages: [
      { title: 'Mood & Direction', icon: '🎨', level: 'phase' as PageLevel, blocks: [
        { id: 'ps1', type: 'h1', content: 'Visual Direction' },
        { id: 'ps1a', type: 'callout', content: 'References: brutalist, muted tones, natural light', icon: '🎨' },
      ] },
      { title: 'Shot List', icon: '📋', level: 'phase' as PageLevel, blocks: [
        { id: 'ps2', type: 'h1', content: 'Shot List' },
        { id: 'ps2a', type: 'database', content: '', databaseId: 'db-deliverables', databaseViewConfig: { viewType: 'board', filters: [], sorts: [], hiddenProperties: [], boardGroupProperty: 'prop-status' } },
      ] },
      { title: 'Delivery Gallery', icon: '🖼️', level: 'phase' as PageLevel, blocks: [
        { id: 'ps3', type: 'gallery', content: '', databaseId: 'db-deliverables', databaseViewConfig: { viewType: 'gallery', filters: [], sorts: [], hiddenProperties: [], cardPreviewProperty: 'prop-name' } },
      ] },
    ],
    databases: ['db-deliverables'],
  },
  {
    name: 'Social Campaign',
    icon: '📱',
    coverGradient: 'from-violet-400 to-purple-600',
    description: 'Content calendar, platform strategy, and scheduling',
    hierarchy: true as const,
    pages: [
      { title: 'Platform Strategy', icon: '📊', level: 'phase' as PageLevel, blocks: [
        { id: 'sc1', type: 'h1', content: 'Platform Strategy' },
        { id: 'sc1a', type: 'h2', content: 'Instagram' },
        { id: 'sc1b', type: 'p', content: 'Reels + Stories focus. 3-5 posts/week.' },
        { id: 'sc1c', type: 'h2', content: 'TikTok' },
        { id: 'sc1d', type: 'p', content: 'Behind-the-scenes + trends. 5-7 posts/week.' },
      ] },
      { title: 'Content Calendar', icon: '📅', level: 'phase' as PageLevel, blocks: [
        { id: 'sc2', type: 'calendar', content: '', databaseId: 'db-deliverables', databaseViewConfig: { viewType: 'calendar', filters: [], sorts: [{ propertyId: 'prop-date', direction: 'ascending' }], hiddenProperties: [] } },
      ] },
      { title: 'Performance', icon: '📈', level: 'phase' as PageLevel, blocks: [
        { id: 'sc3', type: 'h1', content: 'Performance Metrics' },
        { id: 'sc3a', type: 'p', content: 'Track reach, engagement rate, follower growth.' },
        { id: 'sc3b', type: 'database', content: '', databaseId: 'db-deliverables', databaseViewConfig: { viewType: 'table', filters: [], sorts: [{ propertyId: 'prop-priority', direction: 'descending' }], hiddenProperties: [] } },
      ] },
    ],
    databases: ['db-deliverables'],
  },
];

// ─── Permission Labels ──────────────────────────────────────
export const PERMISSION_LABELS: Record<string, { label: string; description: string; color: string }> = {
  viewer:    { label: 'Can View',     description: 'Can read but cannot edit or comment', color: 'slate' },
  commenter: { label: 'Can Comment',  description: 'Can read and add comments, but cannot edit', color: 'blue' },
  editor:    { label: 'Can Edit',     description: 'Full editing access to page content', color: 'green' },
  admin:     { label: 'Full Access',  description: 'Can edit, share, delete, and manage permissions', color: 'amber' },
};

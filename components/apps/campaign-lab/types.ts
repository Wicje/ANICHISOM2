// ─── Block Types ────────────────────────────────────────────
export type BlockType =
  | 'p' | 'h1' | 'h2' | 'h3'
  | 'todo' | 'bullet' | 'num' | 'toggle'
  | 'table' | 'quote' | 'divider' | 'callout'
  | 'image' | 'video' | 'audio' | 'file' | 'code' | 'web'
  | 'database' | 'board' | 'calendar' | 'list' | 'gallery' | 'timeline' | 'linked' | 'form'
  | 'button' | 'template' | 'synced' | 'toc' | 'math' | 'comment';

// ─── Database Property Types ────────────────────────────────
export type PropertyType =
  | 'text' | 'number' | 'select' | 'multi-select'
  | 'date' | 'person' | 'checkbox' | 'url'
  | 'email' | 'phone' | 'relation' | 'rollup' | 'formula'
  | 'created-time' | 'last-edited-time' | 'created-by' | 'last-edited-by';

export type SelectOption = {
  id: string;
  name: string;
  color: string; // e.g. 'blue', 'green', 'red', 'amber', 'purple', 'pink', 'slate'
};

export type DatabaseProperty = {
  id: string;
  name: string;
  type: PropertyType;
  options?: SelectOption[];     // for select / multi-select
  relationDbId?: string;        // for relation — points to another database's id
  rollupPropertyId?: string;    // for rollup — which property to aggregate
  rollupRelationId?: string;    // for rollup — which relation to traverse
  formulaExpression?: string;   // for formula
};

export type PropertyValue = string | number | boolean | string[] | null;

export type DatabaseRow = {
  id: string;
  properties: Record<string, PropertyValue>; // key = property id
};

export type DatabaseSchema = {
  id: string;
  name: string;
  icon: string;
  properties: DatabaseProperty[];
  rows: DatabaseRow[];
};

export type ViewFilter = {
  propertyId: string;
  operator: 'is' | 'is-not' | 'contains' | 'does-not-contain' | 'is-empty' | 'is-not-empty' | 'greater' | 'less' | 'equals';
  value: PropertyValue;
};

export type ViewSort = {
  propertyId: string;
  direction: 'ascending' | 'descending';
};

export type DatabaseViewConfig = {
  viewType: 'table' | 'board' | 'list' | 'gallery' | 'calendar' | 'timeline';
  filters: ViewFilter[];
  sorts: ViewSort[];
  hiddenProperties: string[];
  boardGroupProperty?: string; // which property to group by in board view
  cardPreviewProperty?: string; // which property to show as card preview in gallery
};

// ─── Block ──────────────────────────────────────────────────
export type Block = {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
  children?: Block[];
  rows?: string[][];
  columns?: string[];
  language?: string;
  icon?: string;
  // Database integration
  databaseId?: string;               // references a DatabaseSchema.id
  databaseViewConfig?: DatabaseViewConfig;
  // Comments
  comments?: BlockComment[];
};

// ─── Comments ───────────────────────────────────────────────
export type BlockComment = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
  resolved: boolean;
};

// ─── Sharing & Permissions ──────────────────────────────────
export type PermissionLevel = 'viewer' | 'commenter' | 'editor' | 'admin';

export type ShareLink = {
  id: string;
  token: string;
  permission: PermissionLevel;
  createdAt: number;
  expiresAt?: number;
};

export type PageShare = {
  publicAccess: PermissionLevel | null; // null = not publicly accessible
  shareLinks: ShareLink[];
  invitedUsers: Array<{ userId: string; name: string; permission: PermissionLevel }>;
};

// ─── Page ───────────────────────────────────────────────────
export type Page = {
  id: string;
  parentId: string | null;
  title: string;
  icon: string;
  coverImage?: string;       // URL or gradient preset
  coverGradient?: string;    // e.g. 'from-blue-500 to-purple-600'
  description?: string;      // page subtitle / description
  expanded?: boolean;
  blocks: Block[];
  updatedAt: number;
  createdAt?: number;
  shared?: boolean;
  share?: PageShare;
  favorite?: boolean;
  trash?: boolean;           // soft-delete flag
  trashedAt?: number;
};

// ─── Database Store (global, keyed by db id) ────────────────
export type DatabaseStore = Record<string, DatabaseSchema>;

import { create } from 'zustand';

// ─── Types ──────────────────────────────────────────────────
export type FileSource = 'opfs' | 'google-drive' | 'dropbox' | 'onedrive' | 'local-folder';

export type FileItem = {
  id: string;
  name: string;
  path: string;
  source: FileSource;
  mimeType: string;
  size: number;
  isFolder: boolean;
  lastModified?: string;
  children?: FileItem[];
  expanded?: boolean;
};

export type FileVersion = {
  id: string;
  fileId: string;
  source: FileSource;
  content: string | Blob;
  mimeType: string;
  size: number;
  timestamp: number;
  label?: string;
  author?: string;
};

export type SmartRoute = {
  pattern: string;          // mime type or extension pattern
  appId: string;            // app to open with
  label: string;
};

export type FileVersionEntry = {
  id: string;
  fileId: string;
  filePath: string;
  source: FileSource;
  timestamp: number;
  label: string;
  author?: string;
  size: number;
  mimeType: string;
};

export type FileState = {
  // Navigation
  currentSource: FileSource;
  currentPath: string;
  files: FileItem[];
  selectedFiles: Set<string>;
  viewMode: 'list' | 'grid';
  sortBy: 'name' | 'date' | 'size';
  sortDir: 'asc' | 'desc';
  searchQuery: string;

  // Source connections
  connectedSources: FileSource[];
  localFolderName: string | null;

  // Version history
  versionHistory: FileVersionEntry[];

  // Smart routing
  smartRoutes: SmartRoute[];

  // Actions
  setCurrentSource: (source: FileSource) => void;
  setCurrentPath: (path: string) => void;
  setFiles: (files: FileItem[]) => void;
  toggleFileSelection: (fileId: string) => void;
  selectAllFiles: () => void;
  clearSelection: () => void;
  setViewMode: (mode: 'list' | 'grid') => void;
  setSortBy: (sort: 'name' | 'date' | 'size') => void;
  toggleSortDir: () => void;
  setSearchQuery: (query: string) => void;
  connectSource: (source: FileSource) => void;
  disconnectSource: (source: FileSource) => void;
  setLocalFolderName: (name: string | null) => void;

  // Version history
  addVersionEntry: (entry: Omit<FileVersionEntry, 'id' | 'timestamp'>) => void;
  getVersionHistory: (fileId: string) => FileVersionEntry[];

  // Smart routing
  addSmartRoute: (route: SmartRoute) => void;
  removeSmartRoute: (pattern: string) => void;
  resolveSmartRoute: (mimeType: string, fileName: string) => string | null;
  getCompatibleApps: (mimeType: string, fileName: string) => SmartRoute[];

  // File operations
  getFilteredFiles: () => FileItem[];
};

// ─── Default Smart Routes ───────────────────────────────────
const DEFAULT_SMART_ROUTES: SmartRoute[] = [
  { pattern: 'image/*', appId: 'image-viewer', label: 'Open in Image Viewer' },
  { pattern: 'video/*', appId: 'media-player', label: 'Open in Media Player' },
  { pattern: 'audio/*', appId: 'media-player', label: 'Open in Media Player' },
  { pattern: 'application/pdf', appId: 'pdf-reader', label: 'Open in PDF Reader' },
  { pattern: 'text/*', appId: 'code', label: 'Open in Code Editor' },
  { pattern: 'application/json', appId: 'code', label: 'Open in Code Editor' },
  { pattern: '*.psd', appId: 'image-viewer', label: 'Open in Image Viewer' },
  { pattern: '*.ai', appId: 'image-viewer', label: 'Open in Image Viewer' },
  { pattern: '*.figma', appId: 'power-browser', label: 'Open in Power Browser' },
  // Extension-based fallbacks (when MIME type is missing)
  { pattern: '*.png', appId: 'image-viewer', label: 'Open in Image Viewer' },
  { pattern: '*.jpg', appId: 'image-viewer', label: 'Open in Image Viewer' },
  { pattern: '*.jpeg', appId: 'image-viewer', label: 'Open in Image Viewer' },
  { pattern: '*.gif', appId: 'image-viewer', label: 'Open in Image Viewer' },
  { pattern: '*.svg', appId: 'image-viewer', label: 'Open in Image Viewer' },
  { pattern: '*.webp', appId: 'image-viewer', label: 'Open in Image Viewer' },
  { pattern: '*.bmp', appId: 'image-viewer', label: 'Open in Image Viewer' },
  { pattern: '*.tiff', appId: 'image-viewer', label: 'Open in Image Viewer' },
  { pattern: '*.tif', appId: 'image-viewer', label: 'Open in Image Viewer' },
  { pattern: '*.ico', appId: 'image-viewer', label: 'Open in Image Viewer' },
  { pattern: '*.mp4', appId: 'media-player', label: 'Open in Media Player' },
  { pattern: '*.mov', appId: 'media-player', label: 'Open in Media Player' },
  { pattern: '*.webm', appId: 'media-player', label: 'Open in Media Player' },
  { pattern: '*.avi', appId: 'media-player', label: 'Open in Media Player' },
  { pattern: '*.mkv', appId: 'media-player', label: 'Open in Media Player' },
  { pattern: '*.mp3', appId: 'media-player', label: 'Open in Media Player' },
  { pattern: '*.wav', appId: 'media-player', label: 'Open in Media Player' },
  { pattern: '*.ogg', appId: 'media-player', label: 'Open in Media Player' },
  { pattern: '*.flac', appId: 'media-player', label: 'Open in Media Player' },
  { pattern: '*.pdf', appId: 'pdf-reader', label: 'Open in PDF Reader' },
  { pattern: '*.doc', appId: 'code', label: 'Open in Code Editor' },
  { pattern: '*.docx', appId: 'code', label: 'Open in Code Editor' },
  { pattern: '*.xls', appId: 'code', label: 'Open in Code Editor' },
  { pattern: '*.xlsx', appId: 'code', label: 'Open in Code Editor' },
  { pattern: '*.csv', appId: 'code', label: 'Open in Code Editor' },
  { pattern: '*.zip', appId: 'code', label: 'Open in Code Editor' },
];

// ─── Helpers ────────────────────────────────────────────────
const makeId = (): string => crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function matchesPattern(pattern: string, mimeType: string, fileName: string): boolean {
  // Check mime type pattern (e.g., "image/*")
  if (pattern.includes('/')) {
    const [category] = pattern.split('/');
    if (pattern.endsWith('/*')) {
      if (mimeType.startsWith(category + '/')) return true;
    }
    if (mimeType === pattern) return true;
  }

  // Check extension pattern (e.g., "*.psd")
  if (pattern.startsWith('*.')) {
    const ext = pattern.slice(1); // ".psd"
    if (fileName.toLowerCase().endsWith(ext)) return true;
  }

  return false;
}

// ─── Store ──────────────────────────────────────────────────
export const useFileStore = create<FileState>((set, get) => ({
  // Navigation
  currentSource: 'opfs',
  currentPath: '/',
  files: [],
  selectedFiles: new Set<string>(),
  viewMode: 'list',
  sortBy: 'name',
  sortDir: 'asc',
  searchQuery: '',

  // Sources
  connectedSources: ['opfs'],
  localFolderName: null,

  // Versions
  versionHistory: [],

  // Smart routes
  smartRoutes: [...DEFAULT_SMART_ROUTES],

  // ─── Actions ──────────────────────────────────────────
  setCurrentSource: (source) => set({ currentSource: source, currentPath: '/', selectedFiles: new Set(), searchQuery: '' }),
  setCurrentPath: (path) => set({ currentPath: path, selectedFiles: new Set() }),
  setFiles: (files) => set({ files }),

  toggleFileSelection: (fileId) => {
    set(state => {
      const next = new Set(state.selectedFiles);
      if (next.has(fileId)) next.delete(fileId); else next.add(fileId);
      return { selectedFiles: next };
    });
  },

  selectAllFiles: () => {
    set(state => ({
      selectedFiles: new Set(state.files.map(f => f.id)),
    }));
  },

  clearSelection: () => set({ selectedFiles: new Set() }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSortBy: (sort) => set({ sortBy: sort }),
  toggleSortDir: () => set(state => ({ sortDir: state.sortDir === 'asc' ? 'desc' : 'asc' })),
  setSearchQuery: (query) => set({ searchQuery: query }),
  connectSource: (source) => set(state => ({
    connectedSources: state.connectedSources.includes(source)
      ? state.connectedSources
      : [...state.connectedSources, source],
  })),
  disconnectSource: (source) => set(state => ({
    connectedSources: state.connectedSources.filter(s => s !== source),
  })),
  setLocalFolderName: (name) => set({ localFolderName: name }),

  // Version history
  addVersionEntry: (entry) => {
    const newEntry: FileVersionEntry = {
      ...entry,
      id: makeId(),
      timestamp: Date.now(),
    };
    set(state => ({
      versionHistory: [newEntry, ...state.versionHistory].slice(0, 500),
    }));
  },

  getVersionHistory: (fileId) => {
    return get().versionHistory.filter(v => v.fileId === fileId);
  },

  // Smart routing
  addSmartRoute: (route) => set(state => ({
    smartRoutes: [...state.smartRoutes, route],
  })),

  removeSmartRoute: (pattern) => set(state => ({
    smartRoutes: state.smartRoutes.filter(r => r.pattern !== pattern),
  })),

  resolveSmartRoute: (mimeType, fileName) => {
    const { smartRoutes } = get();
    for (const route of smartRoutes) {
      if (matchesPattern(route.pattern, mimeType, fileName)) {
        return route.appId;
      }
    }
    return null;
  },

  getCompatibleApps: (mimeType, fileName) => {
    const { smartRoutes } = get();
    return smartRoutes.filter(route => matchesPattern(route.pattern, mimeType, fileName));
  },

  // Filtered files
  getFilteredFiles: () => {
    const { files, searchQuery, sortBy, sortDir } = get();
    let filtered = files;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(f => f.name.toLowerCase().includes(q));
    }

    return [...filtered].sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'date') cmp = (a.lastModified || '').localeCompare(b.lastModified || '');
      else if (sortBy === 'size') cmp = a.size - b.size;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  },
}));

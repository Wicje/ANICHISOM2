import { create } from 'zustand';
import { withPersistence } from '@/lib/stores/persisted-store';
import {
  Page, PageLevel, DatabaseSchema, DatabaseStore,
  CampaignShare, LinkedDatabase, Notification, NotificationType,
  BlockComment, Block,
} from '@/lib/campaign-types';
import { DEFAULT_DATABASES } from '@/lib/campaign-data';
import { generateId } from '@/lib/utils';

// ─── Store Types ────────────────────────────────────────────
export type CampaignState = {
  // Core data
  pages: Page[];
  databaseStore: DatabaseStore;
  linkedDatabases: LinkedDatabase[];
  campaignShares: CampaignShare[];
  notifications: Notification[];

  // UI state
  activePageId: string | null;
  sidebarOpen: boolean;
  shareModalOpen: boolean;
  coverPickerOpen: boolean;

  // Page CRUD
  addPage: (parentId: string | null, level?: PageLevel) => Page;
  updatePage: (id: string, updates: Partial<Page>) => void;
  deletePage: (id: string) => void;
  restorePage: (id: string) => void;
  setPages: (pages: Page[]) => void;

  // Hierarchy
  movePage: (pageId: string, newParentId: string | null) => void;
  reorderPages: (pageId: string, newSortOrder: number) => void;
  getCampaignPages: (campaignId: string) => Page[];
  getPageLevel: (pageId: string) => PageLevel | undefined;
  getChildren: (parentId: string) => Page[];
  getBreadcrumbs: (pageId: string) => Page[];

  // Database
  updateDatabase: (dbId: string, updates: Partial<DatabaseSchema>) => void;
  addDatabase: (schema: DatabaseSchema) => void;
  linkDatabase: (sourceDbId: string, targetCampaignId: string, label?: string) => LinkedDatabase;
  unlinkDatabase: (linkId: string) => void;
  getLinkedDatabases: (campaignId: string) => LinkedDatabase[];

  // Campaign sharing
  createShareLink: (campaignId: string, label?: string, clientName?: string) => CampaignShare;
  revokeShareLink: (shareId: string) => void;
  getCampaignShares: (campaignId: string) => CampaignShare[];

  // Notifications
  addNotification: (type: NotificationType, userId: string, fromUserId: string, fromUserName: string, pageId: string, message: string, campaignId?: string) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  getUnreadCount: (userId: string) => number;
  getUserNotifications: (userId: string) => Notification[];

  // Comments with @mentions
  addCommentWithMentions: (pageId: string, blockId: string, comment: BlockComment, mentionedUserIds: string[]) => void;

  // UI setters
  setActivePageId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setShareModalOpen: (open: boolean) => void;
  setCoverPickerOpen: (open: boolean) => void;
};

// ─── Store ──────────────────────────────────────────────────
export const useCampaignStore = create<CampaignState>((set, get) => ({
  // ─── Core data ──────────────────────────────────────────
  pages: [],
  databaseStore: Object.fromEntries(DEFAULT_DATABASES.map(db => [db.id, db])),
  linkedDatabases: [],
  campaignShares: [],
  notifications: [],

  // ─── UI state ───────────────────────────────────────────
  activePageId: null,
  sidebarOpen: true,
  shareModalOpen: false,
  coverPickerOpen: false,

  // ─── Page CRUD ──────────────────────────────────────────
  addPage: (parentId, level) => {
    const { pages } = get();
    const parentPage = parentId ? pages.find(p => p.id === parentId) : null;
    const derivedLevel: PageLevel | undefined = level || (parentPage?.level === 'campaign' ? 'phase'
      : parentPage?.level === 'phase' ? 'task'
      : parentPage?.level === 'task' ? 'subtask'
      : parentPage?.level === 'subtask' ? 'subtask'
      : 'campaign');

    const campaignIdForPage = parentPage?.campaignId || (derivedLevel === 'campaign' ? null : parentId);

    const newPage: Page = {
      id: generateId(),
      parentId,
      title: '',
      icon: '📄',
      blocks: [{ id: generateId(), type: 'p', content: '' }],
      updatedAt: Date.now(),
      createdAt: Date.now(),
      expanded: true,
      shared: false,
      favorite: false,
      trash: false,
      level: derivedLevel,
      campaignId: campaignIdForPage || undefined,
      sortOrder: pages.filter(p => p.parentId === parentId).length,
      status: derivedLevel === 'task' || derivedLevel === 'subtask' ? 'todo' : undefined,
    };

    // For campaign-level pages, set campaignId to own id
    if (derivedLevel === 'campaign') {
      newPage.campaignId = newPage.id;
    }

    set(state => ({
      pages: [...state.pages, newPage],
      activePageId: newPage.id,
    }));

    // Expand parent
    if (parentId && parentPage && !parentPage.expanded) {
      get().updatePage(parentId, { expanded: true });
    }

    return newPage;
  },

  updatePage: (id, updates) => {
    set(state => ({
      pages: state.pages.map(p =>
        p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
      ),
    }));
  },

  deletePage: (id) => {
    const { pages, activePageId } = get();
    // Collect all descendant IDs
    const collectDescendants = (pageId: string): string[] => {
      const children = pages.filter(p => p.parentId === pageId);
      return [pageId, ...children.flatMap(c => collectDescendants(c.id))];
    };

    const idsToTrash = collectDescendants(id);
    set(state => ({
      pages: state.pages.map(p =>
        idsToTrash.includes(p.id) ? { ...p, trash: true, trashedAt: Date.now() } : p
      ),
      activePageId: activePageId && idsToTrash.includes(activePageId)
        ? (state.pages.find(p => !idsToTrash.includes(p.id) && !p.trash)?.id || null)
        : activePageId,
    }));
  },

  restorePage: (id) => {
    const { pages } = get();
    const collectDescendants = (pageId: string): string[] => {
      const children = pages.filter(p => p.parentId === pageId && p.trash);
      return [pageId, ...children.flatMap(c => collectDescendants(c.id))];
    };

    const idsToRestore = collectDescendants(id);
    set(state => ({
      pages: state.pages.map(p =>
        idsToRestore.includes(p.id) ? { ...p, trash: false, trashedAt: undefined } : p
      ),
    }));
  },

  setPages: (pages) => set({ pages }),

  // ─── Hierarchy ──────────────────────────────────────────
  movePage: (pageId, newParentId) => {
    const { pages } = get();
    const page = pages.find(p => p.id === pageId);
    if (!page) return;

    const newParent = newParentId ? pages.find(p => p.id === newParentId) : null;
    const level: PageLevel = newParent
      ? (newParent.level === 'campaign' ? 'phase'
        : newParent.level === 'phase' ? 'task'
        : newParent.level === 'task' ? 'subtask'
        : 'subtask')
      : 'campaign';

    set(state => ({
      pages: state.pages.map(p =>
        p.id === pageId
          ? {
              ...p,
              parentId: newParentId,
              level,
              campaignId: newParent?.campaignId || (level === 'campaign' ? pageId : newParentId) || undefined,
              updatedAt: Date.now(),
            }
          : p
      ),
    }));
  },

  reorderPages: (pageId, newSortOrder) => {
    set(state => ({
      pages: state.pages.map(p =>
        p.id === pageId ? { ...p, sortOrder: newSortOrder, updatedAt: Date.now() } : p
      ),
    }));
  },

  getCampaignPages: (campaignId) => {
    return get().pages.filter(p => p.campaignId === campaignId && !p.trash);
  },

  getPageLevel: (pageId) => {
    return get().pages.find(p => p.id === pageId)?.level;
  },

  getChildren: (parentId) => {
    return get().pages
      .filter(p => p.parentId === parentId && !p.trash)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },

  getBreadcrumbs: (pageId) => {
    const { pages } = get();
    const pageById = new Map(pages.map(p => [p.id, p]));
    const trail: Page[] = [];
    let current: Page | null = pageById.get(pageId) || null;
    while (current) {
      trail.unshift(current);
      current = current.parentId ? pageById.get(current.parentId) || null : null;
    }
    return trail;
  },

  // ─── Database ───────────────────────────────────────────
  updateDatabase: (dbId, updates) => {
    set(state => ({
      databaseStore: {
        ...state.databaseStore,
        [dbId]: { ...state.databaseStore[dbId]!, ...updates },
      },
    }));
  },

  addDatabase: (schema) => {
    set(state => ({
      databaseStore: { ...state.databaseStore, [schema.id]: schema },
    }));
  },

  linkDatabase: (sourceDbId, targetCampaignId, label) => {
    const link: LinkedDatabase = {
      id: generateId(),
      sourceDbId,
      targetCampaignId,
      label,
      syncDirection: 'source-to-target',
    };
    set(state => ({
      linkedDatabases: [...state.linkedDatabases, link],
    }));
    return link;
  },

  unlinkDatabase: (linkId) => {
    set(state => ({
      linkedDatabases: state.linkedDatabases.filter(l => l.id !== linkId),
    }));
  },

  getLinkedDatabases: (campaignId) => {
    return get().linkedDatabases.filter(l => l.targetCampaignId === campaignId);
  },

  // ─── Campaign sharing ──────────────────────────────────
  createShareLink: (campaignId, label, clientName) => {
    const share: CampaignShare = {
      id: generateId(),
      campaignId,
      token: generateId(),
      permission: 'viewer',
      createdAt: Date.now(),
      label,
      clientName,
    };
    set(state => ({
      campaignShares: [...state.campaignShares, share],
    }));
    return share;
  },

  revokeShareLink: (shareId) => {
    set(state => ({
      campaignShares: state.campaignShares.filter(s => s.id !== shareId),
    }));
  },

  getCampaignShares: (campaignId) => {
    return get().campaignShares.filter(s => s.campaignId === campaignId);
  },

  // ─── Notifications ─────────────────────────────────────
  addNotification: (type, userId, fromUserId, fromUserName, pageId, message, campaignId) => {
    const notification: Notification = {
      id: generateId(),
      type,
      userId,
      fromUserId,
      fromUserName,
      pageId,
      campaignId,
      message,
      read: false,
      createdAt: Date.now(),
    };
    set(state => ({
      notifications: [notification, ...state.notifications],
    }));
  },

  markNotificationRead: (notificationId) => {
    set(state => ({
      notifications: state.notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
    }));
  },

  markAllNotificationsRead: (userId) => {
    set(state => ({
      notifications: state.notifications.map(n =>
        n.userId === userId ? { ...n, read: true } : n
      ),
    }));
  },

  getUnreadCount: (userId) => {
    return get().notifications.filter(n => n.userId === userId && !n.read).length;
  },

  getUserNotifications: (userId) => {
    return get().notifications.filter(n => n.userId === userId);
  },

  // ─── Comments with @mentions ───────────────────────────
  addCommentWithMentions: (pageId, blockId, comment, mentionedUserIds) => {
    const { pages, addNotification } = get();
    const page = pages.find(p => p.id === pageId);
    if (!page) return;

    const updatedBlocks = page.blocks.map(b =>
      b.id === blockId
        ? { ...b, comments: [...(b.comments || []), { ...comment, mentionedUserIds }] }
        : b
    );
    get().updatePage(pageId, { blocks: updatedBlocks });

    // Send notifications for each mentioned user
    mentionedUserIds.forEach(userId => {
      addNotification(
        'mention',
        userId,
        comment.userId,
        comment.userName,
        pageId,
        `${comment.userName} mentioned you: "${comment.text.slice(0, 80)}${comment.text.length > 80 ? '...' : ''}"`,
        page.campaignId,
      );
    });
  },

  // ─── UI setters ────────────────────────────────────────
  setActivePageId: (id) => set({ activePageId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setShareModalOpen: (open) => set({ shareModalOpen: open }),
  setCoverPickerOpen: (open) => set({ coverPickerOpen: open }),
}));

withPersistence(useCampaignStore, 'campaign-state', ['pages', 'databaseStore', 'linkedDatabases', 'campaignShares', 'notifications']);

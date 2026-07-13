import { create } from 'zustand';

// ─── Types ──────────────────────────────────────────────────
export type MoodboardNodeType = 'image' | 'text' | 'video' | 'embed';

export type MoodboardNode = {
  id: string;
  type: MoodboardNodeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content: string;
  backgroundColor?: string;
  tags?: string[];
  groupId?: string;
  reactions?: Record<string, string[]>;
  campaignLinkId?: string;
  locked?: boolean;
  label?: string;
};

export type MoodboardBoard = {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  nodes: MoodboardNode[];
  campaignId?: string;          // linked campaign
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  shared?: boolean;
};

export type VoteResult = {
  nodeId: string;
  approved: boolean;
  timestamp: number;
};

export type ClipPayload = {
  url?: string;
  title?: string;
  image?: string;
  source?: string;              // which pinned app it came from
};

export type MoodboardState = {
  // Boards
  boards: MoodboardBoard[];
  activeBoardId: string | null;

  // Vote mode
  voteMode: boolean;
  voteIndex: number;
  voteResults: VoteResult[];

  // Clip queue
  clipQueue: ClipPayload[];
  autoClipEnabled: boolean;

  // Board CRUD
  addBoard: (name: string, description?: string) => MoodboardBoard;
  updateBoard: (id: string, updates: Partial<MoodboardBoard>) => void;
  deleteBoard: (id: string) => void;
  setActiveBoardId: (id: string | null) => void;

  // Campaign linking
  linkBoardToCampaign: (boardId: string, campaignId: string) => void;
  unlinkBoardFromCampaign: (boardId: string) => void;
  getBoardsForCampaign: (campaignId: string) => MoodboardBoard[];

  // Voting
  startVote: () => void;
  stopVote: () => void;
  recordVote: (nodeId: string, approved: boolean) => void;
  advanceVote: () => void;
  getApprovedNodes: () => string[];

  // Clipping
  addClip: (clip: ClipPayload) => void;
  processClipQueue: () => ClipPayload | null;
  setAutoClip: (enabled: boolean) => void;

  // Board selection
  getCurrentBoard: () => MoodboardBoard | undefined;
};

// ─── Helpers ────────────────────────────────────────────────
const makeId = (): string => crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ─── Store ──────────────────────────────────────────────────
export const useMoodboardStore = create<MoodboardState>((set, get) => ({
  // Boards
  boards: [],
  activeBoardId: null,

  // Vote mode
  voteMode: false,
  voteIndex: 0,
  voteResults: [],

  // Clip queue
  clipQueue: [],
  autoClipEnabled: true,

  // ─── Board CRUD ──────────────────────────────────────────
  addBoard: (name, description) => {
    const board: MoodboardBoard = {
      id: makeId(),
      name,
      description,
      nodes: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set(state => ({
      boards: [...state.boards, board],
      activeBoardId: board.id,
    }));
    return board;
  },

  updateBoard: (id, updates) => {
    set(state => ({
      boards: state.boards.map(b =>
        b.id === id ? { ...b, ...updates, updatedAt: Date.now() } : b
      ),
    }));
  },

  deleteBoard: (id) => {
    set(state => ({
      boards: state.boards.filter(b => b.id !== id),
      activeBoardId: state.activeBoardId === id ? null : state.activeBoardId,
    }));
  },

  setActiveBoardId: (id) => set({ activeBoardId: id }),

  // ─── Campaign linking ───────────────────────────────────
  linkBoardToCampaign: (boardId, campaignId) => {
    get().updateBoard(boardId, { campaignId });
  },

  unlinkBoardFromCampaign: (boardId) => {
    get().updateBoard(boardId, { campaignId: undefined });
  },

  getBoardsForCampaign: (campaignId) => {
    return get().boards.filter(b => b.campaignId === campaignId);
  },

  // ─── Voting ─────────────────────────────────────────────
  startVote: () => set({ voteMode: true, voteIndex: 0, voteResults: [] }),
  stopVote: () => set({ voteMode: false, voteIndex: 0 }),

  recordVote: (nodeId, approved) => {
    const result: VoteResult = { nodeId, approved, timestamp: Date.now() };
    set(state => ({
      voteResults: [...state.voteResults, result],
    }));
  },

  advanceVote: () => set(state => ({ voteIndex: state.voteIndex + 1 })),

  getApprovedNodes: () => {
    return get().voteResults.filter(r => r.approved).map(r => r.nodeId);
  },

  // ─── Clipping ───────────────────────────────────────────
  addClip: (clip) => {
    set(state => ({
      clipQueue: [...state.clipQueue, clip],
    }));
    // Auto-process if enabled
    if (get().autoClipEnabled) {
      get().processClipQueue();
    }
  },

  processClipQueue: () => {
    const { clipQueue } = get();
    if (clipQueue.length === 0) return null;
    const [clip, ...rest] = clipQueue;
    set({ clipQueue: rest });
    return clip ?? null;
  },

  setAutoClip: (enabled) => set({ autoClipEnabled: enabled }),

  getCurrentBoard: () => {
    const { boards, activeBoardId } = get();
    return boards.find(b => b.id === activeBoardId);
  },
}));

export type NodeComment = {
  id: string;
  author: string;
  text: string;
  createdAt: number;
  parentId?: string;
};

export type BoardNode = {
  id: string;
  type: 'image' | 'text' | 'video' | 'embed' | 'figma' | 'github';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content: string;
  backgroundColor?: string;
  tags?: string[];
  groupId?: string;
  reactions?: Record<string, string[]>;
  comments?: NodeComment[];
  campaignLinkId?: string;
  locked?: boolean;
  label?: string;
};

export type Comment = {
  id: string;
  x: number;
  y: number;
  text: string;
  author: string;
};

export type BoardGroup = {
  id: string;
  name: string;
  color: string;
  collapsed?: boolean;
};

export type BoardTag = {
  id: string;
  name: string;
  color: string;
};

export type Connection = {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  color?: string;
};

export type CanvasMode = 'select' | 'pan' | 'comment' | 'connect';

export const REACTION_EMOJIS = ['like', 'heart', 'star', 'fire', 'target', 'idea'];
export const NODE_COLORS = [
  '#ffffff', '#fef3c7', '#dcfce7', '#dbeafe', '#fce7f3',
  '#f3e8ff', '#e0e7ff', '#fed7aa', '#d1fae5', '#fecaca',
  '#f5f5f4', '#1e1e1e',
];
export const GROUP_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
  '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e',
];
export const TAG_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
  '#8b5cf6', '#ec4899', '#64748b',
];
export const SNAP_GRID_SIZE = 24;

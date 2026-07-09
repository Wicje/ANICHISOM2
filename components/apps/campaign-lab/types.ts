export type BlockType = 'p' | 'h1' | 'h2' | 'h3' | 'todo' | 'bullet' | 'num' | 'toggle' | 'table' | 'quote' | 'divider' | 'callout' | 'image' | 'video' | 'audio' | 'file' | 'code' | 'web' | 'database' | 'board' | 'calendar' | 'list' | 'gallery' | 'timeline' | 'linked' | 'form' | 'button' | 'template' | 'synced' | 'toc' | 'math' | 'comment';

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
};

export type Page = {
  id: string;
  parentId: string | null;
  title: string;
  icon: string;
  expanded?: boolean;
  blocks: Block[];
  updatedAt: number;
  shared?: boolean;
};

export type BlockType = 'p' | 'h1' | 'h2' | 'h3' | 'todo' | 'bullet' | 'image' | 'database' | 'code';

export type Block = {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
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

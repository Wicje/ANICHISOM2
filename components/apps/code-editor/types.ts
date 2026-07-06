export interface FileNode {
  id: string;
  name: string;
  type: string;
  folder: string;
}

export interface AgentMessage {
  role: 'user' | 'agent';
  content: string;
}

export type ActivityTab = 'explorer' | 'search' | 'git' | 'debug';

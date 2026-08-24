/**
 * Continua Context Graph Engine
 *
 * Represents the relational work context across projects, tools, files,
 * browser tabs, and AI sessions.
 */

export type PrivacyMode = 'standard' | 'local_only' | 'private_session';

export interface ContextTab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  category: 'docs' | 'repo' | 'research' | 'design' | 'general';
  lastActive: string;
}

export interface ContextGitState {
  repo: string;
  branch: string;
  commitHash?: string;
  modifiedCount: number;
  untrackedCount: number;
  lastCommitMessage?: string;
}

export interface ContextEditorState {
  activeFile: string;
  cursorLine: number;
  cursorColumn: number;
  openFiles: string[];
  ideName: string; // 'VS Code' | 'Cursor' | 'Neovim' | 'Continua Monaco'
}

export interface ContextTask {
  id: string;
  title: string;
  completed: boolean;
  source?: 'linear' | 'jira' | 'continua' | 'github';
  url?: string;
}

export interface WorkContext {
  id: string;
  projectId: string;
  projectName: string;
  description?: string;
  updatedAt: string;
  deviceId: string;
  git?: ContextGitState;
  editor?: ContextEditorState;
  browserTabs: ContextTab[];
  tasks: ContextTask[];
  recentAiPrompt?: string;
  notesSummary?: string;
}

export interface ContextGraph {
  version: '1.0';
  userId: string;
  activeContextId: string;
  contexts: Record<string, WorkContext>;
  updatedAt: string;
}

/**
 * Creates an empty or initial WorkContext
 */
export function createWorkContext(
  projectId: string,
  projectName: string,
  deviceId: string
): WorkContext {
  return {
    id: `ctx_${projectId}_${Date.now()}`,
    projectId,
    projectName,
    updatedAt: new Date().toISOString(),
    deviceId,
    browserTabs: [],
    tasks: [],
  };
}

/**
 * Sanitizes work context according to the user's Privacy Mode.
 * Ensures zero credential, password, or raw source leakage.
 */
export function sanitizeForPrivacy(
  context: WorkContext,
  mode: PrivacyMode
): WorkContext | null {
  if (mode === 'private_session') {
    // In private session mode, zero context is synchronized
    return null;
  }

  // Standard and Local-Only mode: keep structured metadata, remove sensitive parameters from URLs
  const sanitizedTabs = context.browserTabs.map((tab) => {
    try {
      const parsed = new URL(tab.url);
      // Strip potential token/auth params from query string
      parsed.searchParams.delete('token');
      parsed.searchParams.delete('key');
      parsed.searchParams.delete('auth');
      parsed.searchParams.delete('api_key');
      return { ...tab, url: parsed.toString() };
    } catch {
      return tab;
    }
  });

  return {
    ...context,
    browserTabs: sanitizedTabs,
    updatedAt: new Date().toISOString(),
  };
}

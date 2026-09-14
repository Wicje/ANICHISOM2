'use client';

import { useWindowStore } from '@/lib/stores/window.store';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';

/**
 * OS-Level AI Context Service
 * Connects the LLM to the live state of the operating system.
 */
export const AICopilot = {
  /**
   * Retrieves a summary of all active windows and their basic metadata.
   */
  getActiveContext: () => {
    const windows = useWindowStore.getState().windows;
    const workspace = useWorkspaceStore.getState().workspaceMode;
    
    return {
      activeWorkspace: workspace,
      openWindows: windows.map(w => ({
        id: w.id,
        app: w.appId,
        title: w.title,
        isMaximized: w.isMaximized,
        isMinimized: w.isMinimized,
        zIndex: w.zIndex,
        data: w.data
      })),
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Evaluates a natural language command against the OS state.
   */
  executeCommand: async (command: string) => {
    // Mock implementation for demo purposes
    console.log(`[AI Copilot] Processing command: "${command}"`);
    
    const lowerCmd = command.toLowerCase();
    
    if (lowerCmd.includes('summarize') && lowerCmd.includes('window')) {
      const activeWindow = useWindowStore.getState().windows.sort((a, b) => b.zIndex - a.zIndex)[0];
      if (activeWindow) {
        return `Summarizing ${activeWindow.title}... (Mock response)`;
      }
      return 'No active window found to summarize.';
    }
    
    if (lowerCmd.includes('close all')) {
      const windows = [...useWindowStore.getState().windows];
      windows.forEach(w => useWindowStore.getState().closeWindow(w.id));
      return 'Closed all windows.';
    }

    return 'Command processed successfully.';
  }
};

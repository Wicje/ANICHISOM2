import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import * as Y from 'yjs';
import { collabStore, resetCollabStore } from '../helpers/collab-test-store';

vi.mock('@/lib/os-context', () => ({
  useOS: () => ({
    performanceMode: 'light' as const,
    currentUser: { id: 'u1', name: 'Test', role: 'admin' },
    workspaceMode: 'private' as const,
    setWorkspaceMode: vi.fn(),
  }),
}));

vi.mock('@/lib/hooks/useCollaborativeDoc', async () => {
  const { collabStore } = await import('../helpers/collab-test-store');
  return {
    useCollaborativeDoc: () => collabStore(),
  };
});

// Storage flows through context-layer → idb-keyval which __tests__/setup.ts mocks in-memory.
vi.mock('@/lib/storage', async () => {
  const { Storage } = await import('@/lib/storage');
  return { Storage };
});

import { ProductivitySuite } from '@/components/apps/productivity-suite';

describe('ProductivitySuite word editor collab sync', () => {
  let ydoc: Y.Doc;
  let windowErrors: Error[];
  let onErrorHandler: ((e: ErrorEvent) => void) | null = null;

  beforeEach(() => {
    resetCollabStore();
    windowErrors = [];
    onErrorHandler = (e: ErrorEvent) => windowErrors.push(e.error ?? new Error(e.message));
    window.addEventListener('error', onErrorHandler as any);
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (onErrorHandler) {
      window.removeEventListener('error', onErrorHandler as any);
      onErrorHandler = null;
    }
    ydoc?.destroy();
  });

  it('does not crash when Yjs sync flips WordEditor into collaborative mode', async () => {
    // Real Y.Doc with a real Y.XmlFragment for the Collaboration extension
    ydoc = new Y.Doc();
    collabStore.setState({
      ydocRef: { current: ydoc },
      sharedTypesRef: {
        current: {
          content: ydoc.getXmlFragment('content'),
          cells: ydoc.getMap('cells'),
          canvas: ydoc.getMap('canvas'),
          slides: ydoc.getArray('slides'),
        },
      },
    });

    render(
      <ProductivitySuite
        window={{ id: 'w1', appId: 'productivity', title: 'Productivity Suite', data: {} } as any}
      />
    );

    // Pre-sync: editor created with immediatelyRender:false and NO Collaboration extension
    expect(screen.getByText(/Loading collaborative editor/i)).toBeTruthy();

    // Simulate IndexedDB sync completing → synced:true
    await act(async () => {
      collabStore.getState().markSynced();
    });

    // The editor should re-create with the Collaboration extension and render content
    await waitFor(() => {
      expect(screen.queryByText(/Loading collaborative editor/i)).toBeNull();
    }, { timeout: 5000 });

    // Verify the editor container is present and rendered
    await waitFor(() => {
      const editorElement = document.querySelector('.tiptap-editor') || document.querySelector('.ProseMirror');
      expect(editorElement).toBeTruthy();
    }, { timeout: 5000 });

    // No uncaught errors during the editor swap
    expect(windowErrors).toHaveLength(0);
  });
});

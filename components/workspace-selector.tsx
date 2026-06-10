/**
 * ANICHISOM OS: Workspace Selector
 * 
 * Dropdown to switch between workspaces
 * Phase 2A: Collaboration
 */

'use client';

import { useContext, useState, useEffect, useRef } from 'react';
import { useOS } from '@/lib/os-context';
import { workspaceAdapter } from '@/lib/firestore-adapter';
import { Workspace } from '@/lib/workspace-types';

export function WorkspaceSelector() {
  const { currentUser, workspaceId, setWorkspaceId, workspaces, setWorkspaces } = useOS();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load workspaces on mount
  useEffect(() => {
    if (!currentUser) return;

    const loadWorkspaces = async () => {
      const userWorkspaces = await workspaceAdapter.getByUser(currentUser.id);
      setWorkspaces(userWorkspaces);
    };

    loadWorkspaces();
  }, [currentUser, setWorkspaces]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const currentWorkspace = workspaces.find((w) => w.id === workspaceId);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium text-white transition-colors"
        title="Switch workspace"
      >
        {currentWorkspace?.name || 'Workspace'}
      </button>

      {open && workspaces.length > 0 && (
        <div className="absolute top-full left-0 mt-1 bg-gray-800 rounded shadow-lg border border-gray-700 z-50 min-w-48">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => {
                setWorkspaceId(workspace.id);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                workspaceId === workspace.id
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-700 text-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{workspace.name}</span>
                {workspace.isPrivate && <span className="text-xs opacity-60">Private</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import { useWorkspaceStore } from '@/lib/stores/workspace.store';
import { useWindowStore } from '@/lib/stores/window.store';
import { Clock, Save } from 'lucide-react';
import { format } from 'date-fns';

interface SnapshotsMenuProps {
  onClose: () => void;
}

export function SnapshotsMenu({ onClose }: SnapshotsMenuProps) {
  const { snapshots, saveSnapshot, restoreSnapshot } = useWorkspaceStore();
  const { windows } = useWindowStore();

  return (
    <div className="absolute top-2 left-64 w-64 bg-black/60 shadow-2xl border border-white/10 rounded-xl backdrop-blur-3xl pointer-events-auto z-[60] overflow-hidden">
      <div className="p-3 border-b border-white/10 flex justify-between items-center">
        <div className="text-white text-sm font-medium flex items-center gap-2">
          <Clock className="w-4 h-4 text-neon-blue" />
          Time Machine
        </div>
        <button onClick={() => saveSnapshot(`Save ${format(new Date(), 'h:mm a')}`, windows)} className="text-white/60 hover:text-white flex items-center gap-1 text-xs">
          <Save className="w-3 h-3" /> Save current
        </button>
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {snapshots.length === 0 ? (
          <div className="p-4 text-white/50 text-xs text-center italic">No snapshots saved.</div>
        ) : (
          <div className="flex flex-col">
            {snapshots.map(snap => (
              <button
                key={snap.id}
                onClick={() => {
                  restoreSnapshot(snap.id);
                  onClose();
                }}
                className="px-4 py-3 hover:bg-white/10 text-left transition-colors border-b border-white/5 last:border-0"
              >
                <div className="text-white text-sm truncate">{snap.name}</div>
                <div className="text-white/40 text-[10px] mt-0.5">{format(new Date(snap.timestamp), 'MMM d, yyyy h:mm a')}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

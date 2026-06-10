/**
 * ANICHISOM OS: Presence Indicator
 * 
 * Show online team members as avatars
 * Phase 2A: Collaboration
 */

'use client';

import { useEffect, useState, useContext } from 'react';
import { useOS } from '@/lib/os-context';
import { presenceAdapter } from '@/lib/firestore-adapter';
import { Presence } from '@/lib/workspace-types';

export function PresenceIndicator() {
  const { workspaceId, currentUser } = useOS();
  const [onlineUsers, setOnlineUsers] = useState<Presence[]>([]);
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);

  // Subscribe to presence changes
  useEffect(() => {
    if (!workspaceId) return;

    const unsub = presenceAdapter.onChanged(workspaceId, (users) => {
      // Filter out current user
      const filtered = users.filter(
        (u) => u.isOnline && u.userId !== currentUser?.id
      );
      setOnlineUsers(filtered);
    });

    setUnsubscribe(() => unsub);

    return () => {
      unsub();
    };
  }, [workspaceId, currentUser?.id]);

  if (onlineUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {onlineUsers.slice(0, 5).map((user) => (
        <div
          key={user.userId}
          className="group relative"
          title={`${user.userName} is online`}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-green-500 flex items-center justify-center text-xs font-bold text-white cursor-default">
            {user.userName.charAt(0).toUpperCase()}
          </div>

          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            {user.userName}
            {user.currentFileId && (
              <div className="text-gray-300 text-xs">
                Editing: {user.currentFileId.substring(0, 20)}...
              </div>
            )}
          </div>
        </div>
      ))}

      {onlineUsers.length > 5 && (
        <div className="text-xs text-gray-400">+{onlineUsers.length - 5} more</div>
      )}
    </div>
  );
}

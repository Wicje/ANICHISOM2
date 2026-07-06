/**
 * ANICHISOM OS: Event History Viewer
 * 
 * Timeline view of all workspace changes
 * Phase 2C: Event History & Undo
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useOS } from '@/lib/os-context';
import { getEventHistoryManager } from '@/lib/event-history-manager';
import { eventAdapter } from '@/lib/firestore-adapter';
import { Event } from '@/lib/workspace-types';
import {
  Undo2, Redo2, Clock, Filter, Search,
  FileText, Users, Settings, Zap, Trash2, Archive, CheckCircle
} from 'lucide-react';
import { limit as firestoreLimit } from 'firebase/firestore';
import { format, formatDistance } from 'date-fns';
import { cn } from '@/lib/utils';
import { List } from 'react-window';


interface EventHistoryViewerProps {
  workspaceId: string;
}

export function EventHistoryViewer({ workspaceId }: EventHistoryViewerProps) {
  const { currentUser } = useOS();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Load events on mount
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const data = await eventAdapter.getByWorkspace(workspaceId, [firestoreLimit(200)]);
        setEvents(data.reverse()); // Newest first
      } catch (error) {
        console.error('[v0] Failed to load events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();

    // Update undo/redo status
    const historyManager = getEventHistoryManager();
    if (historyManager) {
      Promise.resolve().then(() => {
        setCanUndo(historyManager.canUndo());
        setCanRedo(historyManager.canRedo());
      });
    }
  }, [workspaceId]);

  // Filter events (derived purely using useMemo)
  const filteredEvents = useMemo(() => {
    let filtered = events;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.type.toLowerCase().includes(query) ||
          (e.comment && e.comment.toLowerCase().includes(query)) ||
          e.userId.toLowerCase().includes(query)
      );
    }

    if (selectedType) {
      filtered = filtered.filter((e) => e.type === selectedType);
    }

    return filtered;
  }, [searchQuery, selectedType, events]);

  const handleUndo = async () => {
    const historyManager = getEventHistoryManager();
    if (historyManager) {
      await historyManager.undo();
      setCanUndo(historyManager.canUndo());
      setCanRedo(historyManager.canRedo());
    }
  };

  const handleRedo = async () => {
    const historyManager = getEventHistoryManager();
    if (historyManager) {
      await historyManager.redo();
      setCanUndo(historyManager.canUndo());
      setCanRedo(historyManager.canRedo());
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'file_created':
      case 'file_updated':
        return <FileText className="w-4 h-4" />;
      case 'user_joined':
      case 'user_left':
        return <Users className="w-4 h-4" />;
      case 'workspace_settings':
        return <Settings className="w-4 h-4" />;
      case 'undo':
        return <Undo2 className="w-4 h-4" />;
      case 'redo':
        return <Redo2 className="w-4 h-4" />;
      case 'project_created':
      case 'project_updated':
        return <Archive className="w-4 h-4" />;
      case 'approval_granted':
      case 'approval_rejected':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: string) => {
    if (type.includes('created')) return 'text-green-400';
    if (type.includes('deleted') || type.includes('archived')) return 'text-red-400';
    if (type.includes('updated')) return 'text-blue-400';
    if (type === 'undo' || type === 'redo') return 'text-yellow-400';
    if (type.includes('approval')) return 'text-purple-400';
    return 'text-gray-400';
  };

  const eventTypes = Array.from(new Set(events.map((e) => e.type)));

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-700 p-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Event History
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                canUndo
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
              Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                canRedo
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
              Redo
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-gray-700 rounded text-white text-sm placeholder-gray-400"
          />
        </div>

        {/* Type Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedType(null)}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              selectedType === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            All
          </button>
          {eventTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                selectedType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {type.replace(/_/g, ' ').split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 h-full min-h-[300px]">
        {loading ? (
          <div className="p-4 text-gray-400">Loading history...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-4 text-gray-400 text-center py-12">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No events found</p>
          </div>
        ) : (
          <List
            rowCount={filteredEvents.length}
            rowHeight={100}
            rowProps={{}}
            className="divide-y divide-gray-700 h-full w-full"
            rowComponent={({ index, style }) => {
              const event = filteredEvents[index];
              const prevEvent = index > 0 ? filteredEvents[index - 1] : null;
              const eventDate = event.createdAt || event.timestamp;
              const prevEventDate = prevEvent ? (prevEvent.createdAt || prevEvent.timestamp) : null;
              const showDateDivider =
                !prevEvent || !prevEventDate ||
                format(eventDate, 'yyyy-MM-dd') !==
                  format(prevEventDate, 'yyyy-MM-dd');

              return (
                <div style={style} key={event.id} className="box-border">
                  {showDateDivider && (
                    <div className="px-4 py-1 bg-gray-800/50 text-xs font-semibold text-gray-400 sticky top-0 z-10">
                      {format(eventDate, 'MMMM d, yyyy')}
                    </div>
                  )}
                  <div className="px-4 py-2 hover:bg-gray-800/50 transition-colors h-full flex flex-col justify-center overflow-hidden">
                    <div className="flex items-start gap-3">
                      <div className={cn('mt-1', getEventColor(event.type))}>
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {event.type.replace(/_/g, ' ').charAt(0).toUpperCase() +
                              event.type.replace(/_/g, ' ').slice(1)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDistance(eventDate, new Date(), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        {event.comment && (
                          <p className="text-sm text-gray-400 mt-1 truncate">{event.comment}</p>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          by {event.userId}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        )}
      </div>
    </div>
  );
}

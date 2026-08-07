/**
 * ContinuaOS: Time Machine
 * 
 * Browse and restore workspace states from the past
 * Phase 2C: Event History & Undo
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useOS } from '@/lib/os-context';
import { eventAdapter } from '@/lib/supabase-adapter';
import { Event } from '@/lib/workspace-types';
import {
  Clock, ChevronLeft, ChevronRight, Play, Pause, RotateCcw,
  Calendar as CalendarIcon, Activity
} from 'lucide-react';
import { format, subDays, addDays, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface TimeMachineProps {
  workspaceId: string;
}

export function TimeMachine({ workspaceId }: TimeMachineProps) {
  const { currentUser } = useOS();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [playing, setPlaying] = useState(false);
  const [currentEventIndex, setCurrentEventIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: subDays(new Date(), 30), end: new Date() });

  // Load events for the workspace
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const data = await eventAdapter.getByWorkspace(workspaceId);
        setEvents(data.sort((a, b) => {
          const aTime = (a.createdAt || a.timestamp).getTime();
          const bTime = (b.createdAt || b.timestamp).getTime();
          return aTime - bTime;
        }));
      } catch (error) {
        console.error('[v0] Failed to load events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [workspaceId]);

  const eventsOnSelectedDate = useMemo(() => events.filter(
    (e) =>
      format(e.createdAt || e.timestamp, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
  ), [events, selectedDate]);

  // Auto-play animation
  useEffect(() => {
    if (!playing || eventsOnSelectedDate.length === 0) return;

    const interval = setInterval(() => {
      setCurrentEventIndex((prev) => {
        if (prev >= eventsOnSelectedDate.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [playing, eventsOnSelectedDate]);

  const getEventColor = (type: string) => {
    if (type.includes('created')) return 'from-green-600 to-emerald-600';
    if (type.includes('deleted')) return 'from-red-600 to-rose-600';
    if (type.includes('updated')) return 'from-blue-600 to-cyan-600';
    if (type === 'undo' || type === 'redo') return 'from-yellow-600 to-amber-600';
    return 'from-emerald-600 to-pink-600';
  };

  const handlePreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
    setCurrentEventIndex(0);
    setPlaying(false);
  };

  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
    setCurrentEventIndex(0);
    setPlaying(false);
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setCurrentEventIndex(0);
    setPlaying(false);
  };

  const handleRestore = () => {
    if (currentEventIndex >= eventsOnSelectedDate.length) return;
    const event = eventsOnSelectedDate[currentEventIndex];
    // Implementation would actually restore the state
  };

  // Calculate activity heatmap
  const getActivityForDate = (date: Date): number => {
    return events.filter(
      (e) => format(e.createdAt || e.timestamp, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    ).length;
  };

  const maxActivity = Math.max(...Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), i);
    return getActivityForDate(date);
  }));

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-gray-900 to-gray-950 text-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-700 p-6 shrink-0">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Clock className="w-6 h-6" />
          Time Machine
        </h1>
        <p className="text-gray-400 text-sm">
          Browse and review historical states of your workspace
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Timeline Visualization */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="mb-4 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-400">30-Day Activity</span>
          </div>

          {/* Heatmap */}
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: 30 }).map((_, i) => {
              const date = subDays(new Date(), 29 - i);
              const activity = getActivityForDate(date);
              const intensity = activity === 0 ? 0 : Math.min(activity / maxActivity, 1);

              return (
                <button
                  key={i}
                  onClick={() => handleDateChange(date)}
                  className={cn(
                    'w-6 h-6 rounded text-xs transition-all hover:scale-110',
                    activity === 0
                      ? 'bg-gray-700 text-gray-500'
                      : `bg-gradient-to-br ${getEventColor('updated')}`,
                    selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                      ? 'ring-2 ring-yellow-400'
                      : ''
                  )}
                  title={`${format(date, 'MMM d')}: ${activity} events`}
                >
                  {activity > 0 && <Activity className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date & Controls */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold">
              {format(selectedDate, 'MMMM d, yyyy')}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePreviousDay}
                className="p-2 hover:bg-gray-700 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextDay}
                className="p-2 hover:bg-gray-700 rounded transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setPlaying(!playing)}
              className={cn(
                'px-3 py-2 rounded text-sm transition-colors flex items-center gap-2',
                playing
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              )}
            >
              {playing ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Play
                </>
              )}
            </button>

            {eventsOnSelectedDate.length > 0 && (
              <div className="text-sm text-gray-400">
                {currentEventIndex + 1} / {eventsOnSelectedDate.length}
              </div>
            )}

            <div className="flex-1" />

            <button
              onClick={handleRestore}
              disabled={currentEventIndex >= eventsOnSelectedDate.length}
              className={cn(
                'px-3 py-2 rounded text-sm transition-colors flex items-center gap-2',
                currentEventIndex < eventsOnSelectedDate.length
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              )}
            >
              <RotateCcw className="w-4 h-4" />
              Restore
            </button>
          </div>
        </div>

        {/* Events List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-gray-400">Loading events...</div>
          ) : eventsOnSelectedDate.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No events on {format(selectedDate, 'MMM d, yyyy')}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {eventsOnSelectedDate.map((event: Event, idx: number) => (
                <div
                  key={event.id}
                  className={cn(
                    'p-3 rounded border transition-all',
                    idx === currentEventIndex
                      ? `bg-gradient-to-r ${getEventColor(event.type)} border-yellow-400 ring-2 ring-yellow-400`
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600',
                    idx < currentEventIndex && 'opacity-60'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-sm">
                        {event.type.replace(/_/g, ' ')}
                      </div>
                      {event.comment && (
                        <div className="text-xs text-gray-300 mt-1">{event.comment}</div>
                      )}
                      <div className="text-xs text-gray-400 mt-2">
                        {format(event.createdAt || event.timestamp, 'HH:mm:ss')} • {event.userId}
                      </div>
                    </div>
                    {idx === currentEventIndex && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded text-xs font-semibold">
                        ▶ Now
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

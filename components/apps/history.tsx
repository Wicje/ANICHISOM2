'use client';

import React, { useState, useEffect } from 'react';
import { OSWindow, useOS } from '@/lib/os-context';
import { History as HistoryIcon, Undo, Redo, ShieldCheck, FileText, Sparkles, MessageSquare, Plus, CheckCircle, Save, Clock, Lock, Unlock } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { Event } from '@/lib/workspace-types';
import { format } from 'date-fns';
import { syncQueue } from '@/lib/sync-queue';
import { cn } from '@/lib/utils';

export function HistoryApp({ window: osWindow }: { window: OSWindow }) {
  const { currentUser, emitEvent } = useOS();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [undoStack, setUndoStack] = useState<Event[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    
    const supabase = getSupabase();
    
    // Initial fetch
    supabase
      .from('events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load events:', error);
          setEvents([
            { id: '1', type: 'file_edited', entityId: 'file-1', userId: 'System', timestamp: new Date(), workspaceId: 'global', comment: 'Edited design guidelines' },
            { id: '2', type: 'comment_added', entityId: 'campaign-1', userId: 'Founder', timestamp: new Date(Date.now() - 60000), workspaceId: 'global', comment: 'Added comment on Nike campaign' },
            { id: '3', type: 'file_locked', entityId: 'file-2', userId: 'System', timestamp: new Date(Date.now() - 120000), workspaceId: 'global', comment: 'Locked file for editing' }
          ]);
        } else {
          setEvents((data || []).map(row => ({ ...row, timestamp: new Date(row.timestamp) })));
        }
        setIsLoaded(true);
      });
    
    // Realtime subscription
    const channel = supabase
      .channel('events:history')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          // Refetch on any change
          supabase
            .from('events')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(100)
            .then(({ data }) => {
              if (data) setEvents(data.map(row => ({ ...row, timestamp: new Date(row.timestamp) })));
            });
        }
      )
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  const getEventIcon = (type: string) => {
    if (type.includes('file')) return <FileText className="w-4 h-4 text-blue-400" />;
    if (type.includes('comment')) return <MessageSquare className="w-4 h-4 text-emerald-400" />;
    if (type.includes('created') || type.includes('added')) return <Plus className="w-4 h-4 text-amber-400" />;
    if (type.includes('locked')) return <Lock className="w-4 h-4 text-rose-400" />;
    if (type.includes('unlocked')) return <Unlock className="w-4 h-4 text-emerald-400" />;
    if (type.includes('approval') || type.includes('granted')) return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (type.includes('snapshot') || type.includes('saved')) return <Save className="w-4 h-4 text-emerald-400" />;
    return <Sparkles className="w-4 h-4 text-white/50" />;
  };

  const handleUndo = () => {
    if (events.length === 0) return;
    const lastEvent = events[0]!;
    
    // In a real CQRS/Event Sourced system, we dispatch a compensating action
    emitEvent({
      workspaceId: lastEvent.workspaceId,
      type: 'undo',
      entityId: lastEvent.entityId,
      userId: currentUser?.id || 'anonymous',
      comment: `Reverted: ${lastEvent.comment || lastEvent.type}`
    });
    
    setUndoStack(prev => [lastEvent, ...prev]);
  };

  const handleRedo = () => {
    if (undoStack.length === 0) return;
    const eventToRestore = undoStack[0]!;
    
    emitEvent({
      workspaceId: eventToRestore.workspaceId,
      type: 'redo',
      entityId: eventToRestore.entityId,
      userId: currentUser?.id || 'anonymous',
      comment: `Restored: ${eventToRestore.comment || eventToRestore.type}`
    });
    
    setUndoStack(prev => prev.slice(1));
  };

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a] text-white/50 font-mono text-sm animate-pulse">
        Loading event history...
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a0a]/90 text-white font-sans overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 shrink-0 bg-black/40">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-medium tracking-wide">Workspace History & Audit Log</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleUndo}
            disabled={events.length === 0}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors border",
              events.length === 0 
                ? "bg-white/5 text-white/30 border-transparent cursor-not-allowed" 
                : "bg-white/10 text-white border-white/10 hover:bg-white/20"
            )}
          >
            <Undo className="w-3.5 h-3.5" /> Undo Last Action
          </button>
          
          <button 
            onClick={handleRedo}
            disabled={undoStack.length === 0}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors border",
              undoStack.length === 0 
                ? "bg-white/5 text-white/30 border-transparent cursor-not-allowed" 
                : "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"
            )}
          >
            <Redo className="w-3.5 h-3.5" /> Redo
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 relative">
        {/* Timeline Line */}
        <div className="absolute left-[39px] top-6 bottom-6 w-px bg-white/10" />

        <div className="flex flex-col gap-6 relative z-10">
          {events.length === 0 ? (
            <div className="text-center text-white/40 text-sm mt-10">No events found in this workspace.</div>
          ) : (
            events.map((event, i) => {
              const dateObj = event.timestamp instanceof Date ? event.timestamp : 
                (event.timestamp as any)?.toDate ? (event.timestamp as any).toDate() : new Date(event.timestamp);
                
              return (
                <div key={event.id || i} className="flex gap-4 group">
                  <div className="w-10 h-10 rounded-full bg-[var(--os-surface)] border border-white/10 flex items-center justify-center shrink-0 z-10 group-hover:border-white/30 group-hover:scale-110 transition-all shadow-xl">
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1 bg-white/5 border border-white/5 rounded-xl p-4 group-hover:bg-white/10 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-medium text-sm text-white/90">
                        {event.comment || event.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                      <div className="text-[10px] text-white/40 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {format(dateObj, 'MMM d, h:mm:ss a')}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3">
                      <div className="text-[10px] bg-black/40 px-2 py-0.5 rounded text-white/50 border border-white/5">
                        User: {event.userId}
                      </div>
                      <div className="text-[10px] bg-black/40 px-2 py-0.5 rounded text-white/50 border border-white/5 font-mono">
                        ID: {event.entityId}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

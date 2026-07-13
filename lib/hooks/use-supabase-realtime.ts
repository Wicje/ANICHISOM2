'use client';

import { useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';

type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseSupabaseRealtimeOptions {
  table: string;
  filter?: string;
  event?: PostgresEvent;
  schema?: string;
  callback: (payload: { eventType: PostgresEvent; new: Record<string, unknown>; old: Record<string, unknown> }) => void;
}

/**
 * Subscribe to Supabase Realtime changes on a table.
 * Automatically cleans up the channel on unmount.
 *
 * Usage:
 *   useSupabaseRealtime({
 *     table: 'events',
 *     filter: `workspaceId=eq.${workspaceId}`,
 *     callback: (payload) => { ... },
 *   });
 */
export function useSupabaseRealtime({
  table,
  filter,
  event = '*',
  schema = 'public',
  callback,
}: UseSupabaseRealtimeOptions): void {
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel(`${table}:${filter || 'all'}`)
      .on(
        'postgres_changes',
        { event, schema, table, filter },
        callback as any,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, event, schema, callback]);
}

/**
 * ANICHISOM OS: Event History Manager
 * 
 * Tracks all workspace changes for undo/redo and audit trail
 * Phase 2C: Event History & Undo
 */

import { Event, EVENT_HISTORY_LIMIT } from './workspace-types';
import { eventAdapter } from './firestore-adapter';
import { limit as firestoreLimit } from 'firebase/firestore';

export interface UndoRedoState {
  past: Event[];
  present: Event | null;
  future: Event[];
}

/**
 * EventHistoryManager maintains event log and undo/redo stacks
 * 
 * Features:
 * - Track all workspace modifications
 * - Undo/redo with event rollback
 * - Event filtering and search
 * - Time-based event grouping
 * - Persisted to Firestore
 */
export class EventHistoryManager {
  private workspaceId: string;
  private userId: string;
  private events: Event[] = [];
  private undoStack: Event[] = [];
  private redoStack: Event[] = [];
  private maxHistorySize: number = EVENT_HISTORY_LIMIT;

  constructor(workspaceId: string, userId: string) {
    this.workspaceId = workspaceId;
    this.userId = userId;
  }

  /**
   * Add an event to the history
   */
  async recordEvent(event: Omit<Event, 'id' | 'createdAt'>): Promise<Event> {
    try {
      const fullEvent: Event = {
        ...event,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      };

      // Add to undo stack (for potential undo)
      this.undoStack.push(fullEvent);
      this.redoStack = []; // Clear redo stack when new action occurs

      // Persist to Firestore
      await eventAdapter.add(fullEvent);

      // Keep local cache size manageable
      if (this.events.length >= this.maxHistorySize) {
        this.events.shift();
      }
      this.events.push(fullEvent);

      return fullEvent;
    } catch (error) {
      console.error('[v0] Failed to record event:', error);
      throw error;
    }
  }

  /**
   * Undo the last action
   */
  async undo(): Promise<Event | null> {
    if (this.undoStack.length === 0) {
      console.warn('[v0] Nothing to undo');
      return null;
    }

    try {
      const eventToUndo = this.undoStack.pop();
      if (!eventToUndo) return null;

      this.redoStack.push(eventToUndo);

      // Record the undo action itself
      const undoEvent: Event = {
        id: crypto.randomUUID(),
        type: 'undo',
        workspaceId: this.workspaceId,
        userId: this.userId,
        comment: `Undo: ${eventToUndo.comment || eventToUndo.type}`,
        entityId: eventToUndo.entityId,
        timestamp: new Date(),
        createdAt: new Date(),
      };

      await eventAdapter.add(undoEvent);
      return undoEvent;
    } catch (error) {
      console.error('[v0] Failed to undo:', error);
      return null;
    }
  }

  /**
   * Redo the last undone action
   */
  async redo(): Promise<Event | null> {
    if (this.redoStack.length === 0) {
      console.warn('[v0] Nothing to redo');
      return null;
    }

    try {
      const eventToRedo = this.redoStack.pop();
      if (!eventToRedo) return null;

      this.undoStack.push(eventToRedo);

      // Record the redo action itself
      const redoEvent: Event = {
        id: crypto.randomUUID(),
        type: 'redo',
        workspaceId: this.workspaceId,
        userId: this.userId,
        comment: `Redo: ${eventToRedo.comment || eventToRedo.type}`,
        entityId: eventToRedo.entityId,
        timestamp: new Date(),
        createdAt: new Date(),
      };

      await eventAdapter.add(redoEvent);
      return redoEvent;
    } catch (error) {
      console.error('[v0] Failed to redo:', error);
      return null;
    }
  }

  /**
   * Get all events for a workspace
   */
  async getEvents(limitVal: number = 100): Promise<Event[]> {
    try {
      return await eventAdapter.getByWorkspace(this.workspaceId, [firestoreLimit(limitVal)]);
    } catch (error) {
      console.error('[v0] Failed to fetch events:', error);
      return [];
    }
  }

  /**
   * Get events for a specific entity
   */
  async getEntityEvents(entityId: string): Promise<Event[]> {
    try {
      return await eventAdapter.getByEntity(this.workspaceId, entityId);
    } catch (error) {
      console.error('[v0] Failed to fetch entity events:', error);
      return [];
    }
  }

  /**
   * Get events by type
   */
  async getEventsByType(type: string): Promise<Event[]> {
    try {
      const events = await eventAdapter.getByWorkspace(this.workspaceId);
      return events.filter((e) => e.type === type);
    } catch (error) {
      console.error('[v0] Failed to fetch events by type:', error);
      return [];
    }
  }

  /**
   * Get events by user
   */
  async getEventsByUser(userId: string): Promise<Event[]> {
    try {
      const events = await eventAdapter.getByWorkspace(this.workspaceId);
      return events.filter((e) => e.userId === userId);
    } catch (error) {
      console.error('[v0] Failed to fetch events by user:', error);
      return [];
    }
  }

  /**
   * Get events in a date range
   */
  async getEventsByDateRange(startDate: Date, endDate: Date): Promise<Event[]> {
    try {
      const events = await eventAdapter.getByWorkspace(this.workspaceId);
      return events.filter((e) => {
        const eventTime = e.createdAt || e.timestamp;
        return eventTime >= startDate && eventTime <= endDate;
      });
    } catch (error) {
      console.error('[v0] Failed to fetch events by date range:', error);
      return [];
    }
  }

  /**
   * Check if an action can be undone
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if an action can be redone
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get current undo/redo state
   */
  getState(): UndoRedoState {
    return {
      past: [...this.undoStack],
      present: this.undoStack[this.undoStack.length - 1] || null,
      future: [...this.redoStack],
    };
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.events = [];
  }

  /**
   * Get statistics about workspace activity
   */
  async getActivityStats(): Promise<{
    totalEvents: number;
    userCount: number;
    eventTypes: Record<string, number>;
    lastEventTime: Date | null;
  }> {
    try {
      const events = await eventAdapter.getByWorkspace(this.workspaceId);

      const eventTypes: Record<string, number> = {};
      const userSet = new Set<string>();

      events.forEach((e) => {
        eventTypes[e.type] = (eventTypes[e.type] || 0) + 1;
        userSet.add(e.userId);
      });

      return {
        totalEvents: events.length,
        userCount: userSet.size,
        eventTypes,
        lastEventTime: events.length > 0 ? (events[events.length - 1].createdAt || events[events.length - 1].timestamp) : null,
      };
    } catch (error) {
      console.error('[v0] Failed to get activity stats:', error);
      return {
        totalEvents: 0,
        userCount: 0,
        eventTypes: {},
        lastEventTime: null,
      };
    }
  }
}

/**
 * Global event history manager instance
 */
let globalEventHistoryManager: EventHistoryManager | null = null;

export function initEventHistoryManager(
  workspaceId: string,
  userId: string
): EventHistoryManager {
  globalEventHistoryManager = new EventHistoryManager(workspaceId, userId);
  return globalEventHistoryManager;
}

export function getEventHistoryManager(): EventHistoryManager | null {
  return globalEventHistoryManager;
}

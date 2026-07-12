/**
 * Supabase Database Types
 *
 * Minimal type definitions for the Supabase tables.
 * When you create tables via SQL migrations, update these types to match.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          members: Json[];
          settings: Json;
          createdAt: string;
          updatedAt: string;
        };
        Insert: Omit<Database['public']['Tables']['workspaces']['Row'], 'createdAt' | 'updatedAt'> & {
          createdAt?: string;
          updatedAt?: string;
        };
        Update: Partial<Database['public']['Tables']['workspaces']['Insert']>;
      };
      projects: {
        Row: {
          id: string;
          workspaceId: string;
          name: string;
          description: string | null;
          status: string;
          priority: string;
          assignees: Json[];
          timeline: Json;
          deliverables: Json;
          createdAt: string;
          updatedAt: string;
        };
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'createdAt' | 'updatedAt'> & {
          createdAt?: string;
          updatedAt?: string;
        };
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
      };
      files: {
        Row: {
          id: string;
          projectId: string;
          name: string;
          type: string;
          size: number;
          content: string | null;
          mimeType: string | null;
          lockedBy: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: Omit<Database['public']['Tables']['files']['Row'], 'createdAt' | 'updatedAt'> & {
          createdAt?: string;
          updatedAt?: string;
        };
        Update: Partial<Database['public']['Tables']['files']['Insert']>;
      };
      events: {
        Row: {
          id: string;
          workspaceId: string;
          entityId: string;
          type: string;
          action: string;
          userId: string;
          userName: string;
          metadata: Json;
          timestamp: string;
        };
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'timestamp'> & {
          timestamp?: string;
        };
        Update: Partial<Database['public']['Tables']['events']['Insert']>;
      };
      presence: {
        Row: {
          id: string;
          userId: string;
          workspaceId: string;
          isOnline: boolean;
          lastSeen: string;
          [key: string]: Json | undefined;
        };
        Insert: Database['public']['Tables']['presence']['Row'];
        Update: Partial<Database['public']['Tables']['presence']['Insert']>;
      };
      snapshots: {
        Row: {
          id: string;
          projectId: string;
          workspaceId: string;
          name: string;
          data: Json;
          createdBy: string;
          createdAt: string;
        };
        Insert: Omit<Database['public']['Tables']['snapshots']['Row'], 'createdAt'> & {
          createdAt?: string;
        };
        Update: Partial<Database['public']['Tables']['snapshots']['Insert']>;
      };
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: string;
          avatar: string | null;
          status: string;
          isAdmin: boolean;
          createdAt: string;
          lastLogin: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'createdAt' | 'lastLogin'> & {
          createdAt?: string;
          lastLogin?: string;
        };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      apps: {
        Row: {
          id: string;
          name: string;
          userId: string;
          config: Json;
          installedAt: string;
          [key: string]: Json | undefined;
        };
        Insert: Database['public']['Tables']['apps']['Row'];
        Update: Partial<Database['public']['Tables']['apps']['Insert']>;
      };
    };
  };
}

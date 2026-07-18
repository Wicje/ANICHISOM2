/**
 * Supabase Database Types
 *
 * Column names match the actual DB schema (snake_case).
 * These types represent what Supabase returns from queries.
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
          owner_id: string;
          members: Json[];
          settings: Json;
          is_private: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['workspaces']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['workspaces']['Insert']>;
      };
      projects: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          description: string | null;
          status: string;
          priority: string;
          assignees: Json[];
          timeline: Json;
          deliverables: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
      };
      files: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          type: string;
          size: number;
          content: string | null;
          mime_type: string | null;
          locked_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['files']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['files']['Insert']>;
      };
      events: {
        Row: {
          id: string;
          workspace_id: string;
          entity_id: string;
          type: string;
          action: string;
          user_id: string;
          user_name: string;
          old_value: Json;
          new_value: Json;
          metadata: Json;
          timestamp: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'timestamp' | 'created_at'> & {
          timestamp?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['events']['Insert']>;
      };
      presence: {
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          is_online: boolean;
          last_seen: string;
          current_file_id: string | null;
          current_app_id: string | null;
          [key: string]: Json | undefined;
        };
        Insert: Database['public']['Tables']['presence']['Row'];
        Update: Partial<Database['public']['Tables']['presence']['Insert']>;
      };
      snapshots: {
        Row: {
          id: string;
          project_id: string;
          workspace_id: string;
          name: string;
          data: Json;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['snapshots']['Row'], 'created_at'> & {
          created_at?: string;
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
          is_admin: boolean;
          created_at: string;
          last_login: string;
          updated_at: string | null;
          subscription_tier: string;
          subscription_status: string;
          subscription_id: string | null;
          subscription_current_period_end: string | null;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'last_login' | 'updated_at'> & {
          created_at?: string;
          last_login?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      apps: {
        Row: {
          id: string;
          name: string;
          user_id: string;
          config: Json;
          installed_at: string;
          [key: string]: Json | undefined;
        };
        Insert: Database['public']['Tables']['apps']['Row'];
        Update: Partial<Database['public']['Tables']['apps']['Insert']>;
      };
      invites: {
        Row: {
          id: string;
          code: string;
          email: string | null;
          role: string;
          created_by: string;
          created_at: string;
          expires_at: string | null;
          max_uses: number;
          use_count: number;
          used_by: string | null;
          used_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['invites']['Row'], 'created_at' | 'use_count'> & {
          created_at?: string;
          use_count?: number;
        };
        Update: Partial<Database['public']['Tables']['invites']['Insert']>;
      };
      context_records: {
        Row: {
          id: string;
          user_id: string;
          domain: string;
          data: Json;
          version: number;
          device_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['context_records']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['context_records']['Insert']>;
      };
      vitals_metrics: {
        Row: {
          id: string;
          name: string;
          value: number;
          rating: string;
          delta: number;
          id_key: string;
          page_url: string;
          user_agent: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vitals_metrics']['Row'], 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['vitals_metrics']['Insert']>;
      };
      plugins: {
        Row: {
          id: string;
          name: string;
          description: string;
          developer: string;
          developer_id: string | null;
          manifest_url: string | null;
          source: string;
          status: string;
          installed_by: string[];
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['plugins']['Row'], 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['plugins']['Insert']>;
      };
      marketplace_submissions: {
        Row: {
          id: string;
          plugin_id: string;
          developer_id: string;
          submitted_at: string;
          status: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_notes: string | null;
        };
        Insert: Omit<Database['public']['Tables']['marketplace_submissions']['Row'], 'submitted_at'> & {
          submitted_at?: string;
        };
        Update: Partial<Database['public']['Tables']['marketplace_submissions']['Insert']>;
      };
      marketplace_apps: {
        Row: {
          id: string;
          plugin_id: string;
          name: string;
          description: string;
          author: string;
          version: string;
          category: string;
          rating: number;
          rating_count: number;
          install_count: number;
          published_at: string;
          developer_id: string;
        };
        Insert: Omit<Database['public']['Tables']['marketplace_apps']['Row'], 'published_at'> & {
          published_at?: string;
        };
        Update: Partial<Database['public']['Tables']['marketplace_apps']['Insert']>;
      };
      share_links: {
        Row: {
          id: string;
          token: string;
          file_id: string;
          created_by: string;
          created_at: string;
          expires_at: string | null;
          max_uses: number | null;
          use_count: number;
          used_by: string[];
        };
        Insert: Omit<Database['public']['Tables']['share_links']['Row'], 'created_at' | 'use_count'> & {
          created_at?: string;
          use_count?: number;
        };
        Update: Partial<Database['public']['Tables']['share_links']['Insert']>;
      };
      private_registries: {
        Row: {
          id: string;
          name: string;
          url: string;
          token: string;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['private_registries']['Row'], 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['private_registries']['Insert']>;
      };
    };
  };
}

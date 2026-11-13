// Generated from Supabase project lola-track (xkiumlisdkxwqlvuqneg). Do not edit by hand.
// Regenerate: npx supabase gen types typescript --project-id xkiumlisdkxwqlvuqneg > src/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      budget_movements: {
        Row: {
          amount_cents: number;
          budget_id: string;
          concept: string | null;
          created_at: string;
          created_by: string;
          household_id: string;
          id: string;
          item_id: string | null;
        };
        Insert: {
          amount_cents: number;
          budget_id: string;
          concept?: string | null;
          created_at?: string;
          created_by?: string;
          household_id: string;
          id?: string;
          item_id?: string | null;
        };
        Update: {
          amount_cents?: number;
          budget_id?: string;
          concept?: string | null;
          created_at?: string;
          created_by?: string;
          household_id?: string;
          id?: string;
          item_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'budget_movements_budget_id_fkey';
            columns: ['budget_id'];
            isOneToOne: false;
            referencedRelation: 'budget_balances';
            referencedColumns: ['budget_id'];
          },
          {
            foreignKeyName: 'budget_movements_budget_id_fkey';
            columns: ['budget_id'];
            isOneToOne: false;
            referencedRelation: 'budgets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'budget_movements_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'budget_movements_item_fk';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
        ];
      };
      budgets: {
        Row: {
          archived: boolean;
          created_at: string;
          household_id: string;
          id: string;
          name: string;
          sort: number;
        };
        Insert: {
          archived?: boolean;
          created_at?: string;
          household_id: string;
          id?: string;
          name: string;
          sort?: number;
        };
        Update: {
          archived?: boolean;
          created_at?: string;
          household_id?: string;
          id?: string;
          name?: string;
          sort?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'budgets_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      events: {
        Row: {
          created_at: string;
          created_by: string;
          ends_at: string | null;
          household_id: string;
          id: string;
          item_id: string | null;
          notes: string | null;
          place: string | null;
          remind_minutes: number | null;
          reminded_at: string | null;
          starts_at: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string;
          ends_at?: string | null;
          household_id: string;
          id?: string;
          item_id?: string | null;
          notes?: string | null;
          place?: string | null;
          remind_minutes?: number | null;
          reminded_at?: string | null;
          starts_at: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          ends_at?: string | null;
          household_id?: string;
          id?: string;
          item_id?: string | null;
          notes?: string | null;
          place?: string | null;
          remind_minutes?: number | null;
          reminded_at?: string | null;
          starts_at?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'events_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
        ];
      };
      household_invites: {
        Row: {
          code: string;
          created_by: string;
          expires_at: string;
          household_id: string;
          used_at: string | null;
          used_by: string | null;
        };
        Insert: {
          code: string;
          created_by: string;
          expires_at?: string;
          household_id: string;
          used_at?: string | null;
          used_by?: string | null;
        };
        Update: {
          code?: string;
          created_by?: string;
          expires_at?: string;
          household_id?: string;
          used_at?: string | null;
          used_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'household_invites_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      household_members: {
        Row: {
          color: string;
          created_at: string;
          display_name: string;
          household_id: string;
          user_id: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          display_name: string;
          household_id: string;
          user_id: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          display_name?: string;
          household_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'household_members_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      households: {
        Row: {
          created_at: string;
          id: string;
          last_urgent_reminder: string | null;
          last_weekly_digest: string | null;
          name: string;
          urgent_reminders: boolean;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_urgent_reminder?: string | null;
          last_weekly_digest?: string | null;
          name: string;
          urgent_reminders?: boolean;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_urgent_reminder?: string | null;
          last_weekly_digest?: string | null;
          name?: string;
          urgent_reminders?: boolean;
        };
        Relationships: [];
      };
      items: {
        Row: {
          area: string | null;
          budget_movement_id: string | null;
          created_at: string;
          created_by: string;
          done_at: string | null;
          done_by: string | null;
          due_date: string | null;
          due_reminded_at: string | null;
          household_id: string;
          id: string;
          link_url: string | null;
          list_id: string | null;
          notes: string | null;
          photo_path: string | null;
          price_actual_cents: number | null;
          price_estimated_cents: number | null;
          priority: Database['public']['Enums']['item_priority'];
          sort_order: number;
          title: string;
          type: Database['public']['Enums']['item_type'];
          updated_at: string;
        };
        Insert: {
          area?: string | null;
          budget_movement_id?: string | null;
          created_at?: string;
          created_by?: string;
          done_at?: string | null;
          done_by?: string | null;
          due_date?: string | null;
          due_reminded_at?: string | null;
          household_id: string;
          id?: string;
          link_url?: string | null;
          list_id?: string | null;
          notes?: string | null;
          photo_path?: string | null;
          price_actual_cents?: number | null;
          price_estimated_cents?: number | null;
          priority?: Database['public']['Enums']['item_priority'];
          sort_order?: number;
          title: string;
          type?: Database['public']['Enums']['item_type'];
          updated_at?: string;
        };
        Update: {
          area?: string | null;
          budget_movement_id?: string | null;
          created_at?: string;
          created_by?: string;
          done_at?: string | null;
          done_by?: string | null;
          due_date?: string | null;
          due_reminded_at?: string | null;
          household_id?: string;
          id?: string;
          link_url?: string | null;
          list_id?: string | null;
          notes?: string | null;
          photo_path?: string | null;
          price_actual_cents?: number | null;
          price_estimated_cents?: number | null;
          priority?: Database['public']['Enums']['item_priority'];
          sort_order?: number;
          title?: string;
          type?: Database['public']['Enums']['item_type'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'items_budget_movement_id_fkey';
            columns: ['budget_movement_id'];
            isOneToOne: false;
            referencedRelation: 'budget_movements';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      lists: {
        Row: {
          archived_at: string | null;
          created_at: string;
          created_by: string | null;
          household_id: string;
          id: string;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          household_id: string;
          id?: string;
          name: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          household_id?: string;
          id?: string;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lists_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          household_id: string;
          id: string;
          p256dh: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          household_id: string;
          id?: string;
          p256dh: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          household_id?: string;
          id?: string;
          p256dh?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      wishes: {
        Row: {
          created_at: string;
          got_at: string | null;
          household_id: string;
          id: string;
          link_url: string | null;
          notes: string | null;
          owner_id: string;
          price_estimated_cents: number | null;
          sort_order: number;
          starred: boolean;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          got_at?: string | null;
          household_id: string;
          id?: string;
          link_url?: string | null;
          notes?: string | null;
          owner_id?: string;
          price_estimated_cents?: number | null;
          sort_order?: number;
          starred?: boolean;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          got_at?: string | null;
          household_id?: string;
          id?: string;
          link_url?: string | null;
          notes?: string | null;
          owner_id?: string;
          price_estimated_cents?: number | null;
          sort_order?: number;
          starred?: boolean;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      wish_claims: {
        Row: {
          claimed_by: string;
          created_at: string;
          household_id: string;
          status: 'apartado' | 'comprado';
          updated_at: string;
          wish_id: string;
        };
        Insert: {
          claimed_by?: string;
          created_at?: string;
          household_id: string;
          status?: 'apartado' | 'comprado';
          updated_at?: string;
          wish_id: string;
        };
        Update: {
          claimed_by?: string;
          created_at?: string;
          household_id?: string;
          status?: 'apartado' | 'comprado';
          updated_at?: string;
          wish_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      budget_balances: {
        Row: {
          added_cents: number | null;
          archived: boolean | null;
          available_cents: number | null;
          budget_id: string | null;
          household_id: string | null;
          name: string | null;
          sort: number | null;
          spent_cents: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'budgets_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      complete_item: {
        Args: { p_actual_cents?: number; p_budget?: string; p_item: string };
        Returns: Database['public']['Tables']['items']['Row'];
        SetofOptions: {
          from: '*';
          to: 'items';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_budget: {
        Args: { p_household: string; p_initial_cents?: number; p_name: string };
        Returns: string;
      };
      create_household: {
        Args: { p_color?: string; p_display_name: string; p_name: string };
        Returns: string;
      };
      create_invite: { Args: { p_household: string }; Returns: string };
      due_reminders: {
        Args: never;
        Returns: {
          event_id: string;
          household_id: string;
          place: string;
          starts_at: string;
          title: string;
        }[];
      };
      is_member: { Args: { h: string }; Returns: boolean };
      join_household: {
        Args: { p_code: string; p_color?: string; p_display_name: string };
        Returns: string;
      };
      switch_household: {
        Args: { p_code: string; p_color?: string; p_display_name: string };
        Returns: string;
      };
      reopen_item: {
        Args: { p_item: string };
        Returns: Database['public']['Tables']['items']['Row'];
        SetofOptions: {
          from: '*';
          to: 'items';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      item_priority: 'urgente' | 'pronto' | 'algun_dia';
      item_type: 'compra' | 'arreglo' | 'tarea';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database['public'];

export type Tables<T extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])> = (PublicSchema['Tables'] &
  PublicSchema['Views'])[T] extends { Row: infer R }
  ? R
  : never;
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update'];
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];

export const Constants = {
  public: {
    Enums: {
      item_priority: ['urgente', 'pronto', 'algun_dia'],
      item_type: ['compra', 'arreglo', 'tarea'],
    },
  },
} as const;

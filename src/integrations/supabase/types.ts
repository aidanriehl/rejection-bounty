export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string
          updated_at: string
          winner_messaging_enabled: boolean
        }
        Insert: {
          id?: string
          updated_at?: string
          winner_messaging_enabled?: boolean
        }
        Update: {
          id?: string
          updated_at?: string
          winner_messaging_enabled?: boolean
        }
        Relationships: []
      }
      challenge_completions: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          user_id: string
          video_url: string | null
          week_key: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          user_id: string
          video_url?: string | null
          week_key: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          user_id?: string
          video_url?: string | null
          week_key?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          id: string
          title: string
          emoji: string
          description: string | null
          week_key: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          emoji?: string
          description?: string | null
          week_key: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          emoji?: string
          description?: string | null
          week_key?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          caption: string | null
          challenge_id: string
          created_at: string
          id: string
          likes: number
          thumbnail_time: number | null
          trim_end: number | null
          trim_start: number | null
          user_id: string
          video_id: string | null
          video_url: string | null
        }
        Insert: {
          caption?: string | null
          challenge_id?: string
          created_at?: string
          id?: string
          likes?: number
          thumbnail_time?: number | null
          trim_end?: number | null
          trim_start?: number | null
          user_id: string
          video_id?: string | null
          video_url?: string | null
        }
        Update: {
          caption?: string | null
          challenge_id?: string
          created_at?: string
          id?: string
          likes?: number
          thumbnail_time?: number | null
          trim_end?: number | null
          trim_start?: number | null
          user_id?: string
          video_id?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      prize_pool: {
        Row: {
          id: string
          month: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          id?: string
          month: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          id?: string
          month?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string
          avatar_stage: number
          created_at: string
          id: string
          profile_photo_url: string | null
          streak: number
          total_completed: number
          username: string | null
        }
        Insert: {
          avatar?: string
          avatar_stage?: number
          created_at?: string
          id: string
          profile_photo_url?: string | null
          streak?: number
          total_completed?: number
          username?: string | null
        }
        Update: {
          avatar?: string
          avatar_stage?: number
          created_at?: string
          id?: string
          profile_photo_url?: string | null
          streak?: number
          total_completed?: number
          username?: string | null
        }
        Relationships: []
      }
      stripe_connect_accounts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          onboarding_complete: boolean
          payouts_enabled: boolean
          stripe_account_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          onboarding_complete?: boolean
          payouts_enabled?: boolean
          stripe_account_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          onboarding_complete?: boolean
          payouts_enabled?: boolean
          stripe_account_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_drawings: {
        Row: {
          created_at: string
          id: string
          prize_amount: number
          status: string
          thumbnail_url: string | null
          trim_end: number | null
          trim_start: number | null
          week_key: string
          winner_user_id: string | null
          winning_video_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          prize_amount?: number
          status?: string
          thumbnail_url?: string | null
          trim_end?: number | null
          trim_start?: number | null
          week_key: string
          winner_user_id?: string | null
          winning_video_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          prize_amount?: number
          status?: string
          thumbnail_url?: string | null
          trim_end?: number | null
          trim_start?: number | null
          week_key?: string
          winner_user_id?: string | null
          winning_video_url?: string | null
        }
        Relationships: []
      }
      winner_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender: string
          week_key: string
          winner_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender?: string
          week_key: string
          winner_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender?: string
          week_key?: string
          winner_user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_tickets: {
        Args: { p_week_key: string }
        Returns: {
          avatar: string
          tickets: number
          user_id: string
          username: string
          video_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

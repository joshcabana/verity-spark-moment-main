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
      appeals: {
        Row: {
          apology_tokens_awarded: number | null
          appeal_text: string | null
          created_at: string
          id: string
          moderation_event_id: string
          resolution_text: string | null
          resolved_at: string | null
          status: string
          user_id: string
          voice_note_url: string | null
        }
        Insert: {
          apology_tokens_awarded?: number | null
          appeal_text?: string | null
          created_at?: string
          id?: string
          moderation_event_id: string
          resolution_text?: string | null
          resolved_at?: string | null
          status?: string
          user_id: string
          voice_note_url?: string | null
        }
        Update: {
          apology_tokens_awarded?: number | null
          appeal_text?: string | null
          created_at?: string
          id?: string
          moderation_event_id?: string
          resolution_text?: string | null
          resolved_at?: string | null
          status?: string
          user_id?: string
          voice_note_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appeals_moderation_event_id_fkey"
            columns: ["moderation_event_id"]
            isOneToOne: false
            referencedRelation: "moderation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeals_moderation_event_id_fkey"
            columns: ["moderation_event_id"]
            isOneToOne: false
            referencedRelation: "my_moderation_events"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          id: string
          match_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_queue: {
        Row: {
          entered_at: string
          gender: string | null
          id: string
          is_warmup: boolean
          match_id: string | null
          matched_at: string | null
          matched_with: string | null
          room_id: string
          seeking_gender: string | null
          status: string
          user_id: string
        }
        Insert: {
          entered_at?: string
          gender?: string | null
          id?: string
          is_warmup?: boolean
          match_id?: string | null
          matched_at?: string | null
          matched_with?: string | null
          room_id?: string
          seeking_gender?: string | null
          status?: string
          user_id: string
        }
        Update: {
          entered_at?: string
          gender?: string | null
          id?: string
          is_warmup?: boolean
          match_id?: string | null
          matched_at?: string | null
          matched_with?: string | null
          room_id?: string
          seeking_gender?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_queue_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_post_spark_feedback: {
        Row: {
          created_at: string
          id: string
          match_id: string
          note: string | null
          rating: string
          spark_outcome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          note?: string | null
          rating: string
          spark_outcome?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          note?: string | null
          rating?: string
          spark_outcome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_post_spark_feedback_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          call_id: string | null
          created_at: string
          id: string
          identity_revealed_at: string | null
          is_mutual: boolean | null
          rematch_match_id: string | null
          room_id: string
          spark_outcome: string
          spark_outcome_updated_at: string | null
          user1_decision: string | null
          user1_id: string
          user1_note: string | null
          user1_reveal_requested_at: string | null
          user1_spark_again_requested_at: string | null
          user2_decision: string | null
          user2_id: string
          user2_note: string | null
          user2_reveal_requested_at: string | null
          user2_spark_again_requested_at: string | null
        }
        Insert: {
          call_id?: string | null
          created_at?: string
          id?: string
          identity_revealed_at?: string | null
          is_mutual?: boolean | null
          rematch_match_id?: string | null
          room_id?: string
          spark_outcome?: string
          spark_outcome_updated_at?: string | null
          user1_decision?: string | null
          user1_id: string
          user1_note?: string | null
          user1_reveal_requested_at?: string | null
          user1_spark_again_requested_at?: string | null
          user2_decision?: string | null
          user2_id: string
          user2_note?: string | null
          user2_reveal_requested_at?: string | null
          user2_spark_again_requested_at?: string | null
        }
        Update: {
          call_id?: string | null
          created_at?: string
          id?: string
          identity_revealed_at?: string | null
          is_mutual?: boolean | null
          rematch_match_id?: string | null
          room_id?: string
          spark_outcome?: string
          spark_outcome_updated_at?: string | null
          user1_decision?: string | null
          user1_id?: string
          user1_note?: string | null
          user1_reveal_requested_at?: string | null
          user1_spark_again_requested_at?: string | null
          user2_decision?: string | null
          user2_id?: string
          user2_note?: string | null
          user2_reveal_requested_at?: string | null
          user2_spark_again_requested_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_rematch_match_id_fkey"
            columns: ["rematch_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_room_id: string
          content: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          chat_room_id: string
          content: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          chat_room_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_events: {
        Row: {
          action_taken: string
          ai_reasoning: string | null
          call_id: string | null
          category: string
          clip_expires_at: string | null
          clip_url: string | null
          confidence: number
          created_at: string
          id: string
          match_id: string | null
          offender_id: string
          review_outcome: string | null
          reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          tier: number
          victim_id: string | null
        }
        Insert: {
          action_taken?: string
          ai_reasoning?: string | null
          call_id?: string | null
          category: string
          clip_expires_at?: string | null
          clip_url?: string | null
          confidence?: number
          created_at?: string
          id?: string
          match_id?: string | null
          offender_id: string
          review_outcome?: string | null
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          tier?: number
          victim_id?: string | null
        }
        Update: {
          action_taken?: string
          ai_reasoning?: string | null
          call_id?: string | null
          category?: string
          clip_expires_at?: string | null
          clip_url?: string | null
          confidence?: number
          created_at?: string
          id?: string
          match_id?: string | null
          offender_id?: string
          review_outcome?: string | null
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          tier?: number
          victim_id?: string | null
        }
        Relationships: []
      }
      moderation_stats: {
        Row: {
          appeals_filed: number
          appeals_overturned: number
          avg_latency_ms: number
          date: string
          false_positive_rate: number
          id: string
          safe_exits: number
          tier0_actions: number
          tier1_warnings: number
          total_calls: number
          updated_at: string
          violation_free_calls: number
        }
        Insert: {
          appeals_filed?: number
          appeals_overturned?: number
          avg_latency_ms?: number
          date?: string
          false_positive_rate?: number
          id?: string
          safe_exits?: number
          tier0_actions?: number
          tier1_warnings?: number
          total_calls?: number
          updated_at?: string
          violation_free_calls?: number
        }
        Update: {
          appeals_filed?: number
          appeals_overturned?: number
          avg_latency_ms?: number
          date?: string
          false_positive_rate?: number
          id?: string
          safe_exits?: number
          tier0_actions?: number
          tier1_warnings?: number
          total_calls?: number
          updated_at?: string
          violation_free_calls?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_emoji: string | null
          bio: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          gender: string | null
          government_id_status: string
          government_id_url: string | null
          id: string
          seeking_gender: string | null
          selfie_url: string | null
          updated_at: string
          user_id: string
          verification_status: string
          verified_phone: boolean
          warmup_calls_remaining: number
        }
        Insert: {
          avatar_emoji?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          gender?: string | null
          government_id_status?: string
          government_id_url?: string | null
          id?: string
          seeking_gender?: string | null
          selfie_url?: string | null
          updated_at?: string
          user_id: string
          verification_status?: string
          verified_phone?: boolean
          warmup_calls_remaining?: number
        }
        Update: {
          avatar_emoji?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          gender?: string | null
          government_id_status?: string
          government_id_url?: string | null
          id?: string
          seeking_gender?: string | null
          selfie_url?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: string
          verified_phone?: boolean
          warmup_calls_remaining?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      selfie_verification_attempts: {
        Row: {
          attempted_at: string
          id: string
          user_id: string
        }
        Insert: {
          attempted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          attempted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          created_at: string
          error: string | null
          event_id: string
          event_type: string
          payload: Json | null
          processed_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_id: string
          event_type: string
          payload?: Json | null
          processed_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event_id?: string
          event_type?: string
          payload?: Json | null
          processed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      token_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_bans: {
        Row: {
          ban_type: string
          created_at: string
          expires_at: string | null
          id: string
          lifted_at: string | null
          moderation_event_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          ban_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          lifted_at?: string | null
          moderation_event_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          ban_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          lifted_at?: string | null
          moderation_event_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bans_moderation_event_id_fkey"
            columns: ["moderation_event_id"]
            isOneToOne: false
            referencedRelation: "moderation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bans_moderation_event_id_fkey"
            columns: ["moderation_event_id"]
            isOneToOne: false
            referencedRelation: "my_moderation_events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_phone_verifications: {
        Row: {
          created_at: string
          phone_hash: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          phone_hash: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          phone_hash?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      runtime_alert_events: {
        Row: {
          id: string
          event_source: string
          event_type: string
          severity: string
          status_code: number | null
          user_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          event_source: string
          event_type: string
          severity?: string
          status_code?: number | null
          user_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          event_source?: string
          event_type?: string
          severity?: string
          status_code?: number | null
          user_id?: string | null
          details?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      spark_extension_log: {
        Row: {
          id: string
          user_id: string
          used_date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          used_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          used_date?: string
          created_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tokens: {
        Row: {
          balance: number
          created_at: string
          free_entries_remaining: number
          free_entries_reset_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          free_entries_remaining?: number
          free_entries_reset_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          free_entries_remaining?: number
          free_entries_reset_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      my_moderation_events: {
        Row: {
          action_taken: string | null
          ai_reasoning: string | null
          category: string | null
          clip_expires_at: string | null
          clip_url: string | null
          confidence: number | null
          created_at: string | null
          id: string | null
          match_id: string | null
          offender_id: string | null
          review_outcome: string | null
          reviewed: boolean | null
          tier: number | null
          victim_id: string | null
        }
        Insert: {
          action_taken?: string | null
          ai_reasoning?: string | null
          category?: string | null
          clip_expires_at?: never
          clip_url?: never
          confidence?: number | null
          created_at?: string | null
          id?: string | null
          match_id?: string | null
          offender_id?: string | null
          review_outcome?: string | null
          reviewed?: boolean | null
          tier?: number | null
          victim_id?: string | null
        }
        Update: {
          action_taken?: string | null
          ai_reasoning?: string | null
          category?: string | null
          clip_expires_at?: never
          clip_url?: never
          confidence?: number | null
          created_at?: string | null
          id?: string | null
          match_id?: string | null
          offender_id?: string | null
          review_outcome?: string | null
          reviewed?: boolean | null
          tier?: number | null
          victim_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      increment_user_tokens: {
        Args: {
          p_delta: number
          p_description?: string
          p_type: string
          p_user_id: string
        }
        Returns: number
      }
      get_public_transparency_stats: {
        Args: never
        Returns: {
          appeals_success_rate: number
          average_moderation_latency_ms: number
          tier0_count: number
          tier1_count: number
          total_calls_last_month: number
          total_violations: number
          violation_free_percentage: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_chat_participant: { Args: { _chat_room_id: string }; Returns: boolean }
      is_match_participant: { Args: { _match_id: string }; Returns: boolean }
      cleanup_stale_queue_entries: {
        Args: Record<string, never>
        Returns: number
      }
      log_runtime_alert_event: {
        Args: {
          p_event_source: string
          p_event_type: string
          p_severity?: string
          p_status_code?: number
          p_user_id?: string
          p_details?: Json
        }
        Returns: undefined
      }
      rpc_cancel_matchmaking: {
        Args: { p_queue_id?: string }
        Returns: Json
      }
      rpc_enter_matchmaking: {
        Args: { p_is_warmup?: boolean; p_room_id: string }
        Returns: Json
      }
      rpc_request_identity_reveal: {
        Args: { p_match_id: string }
        Returns: Json
      }
      rpc_request_spark_again: {
        Args: { p_match_id: string }
        Returns: Json
      }
      rpc_submit_post_spark_feedback: {
        Args: {
          p_match_id: string
          p_note?: string
          p_rating: string
          p_spark_outcome?: string
        }
        Returns: Json
      }
      rpc_submit_match_decision: {
        Args: { p_decision: string; p_match_id: string; p_note?: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

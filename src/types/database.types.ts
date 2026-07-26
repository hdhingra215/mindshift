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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string
          criteria: Json
          deleted_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          criteria?: Json
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          criteria?: Json
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: []
      }
      attempts: {
        Row: {
          bias_id: string | null
          completed_at: string
          created_at: string
          hints_used: number
          id: string
          outcome_id: string
          player_id: string
          reflected: boolean
          response_time_ms: number
          scenario_id: string
          selected_choice_id: string
          session_id: string
        }
        Insert: {
          bias_id?: string | null
          completed_at?: string
          created_at?: string
          hints_used?: number
          id?: string
          outcome_id: string
          player_id: string
          reflected?: boolean
          response_time_ms: number
          scenario_id: string
          selected_choice_id: string
          session_id: string
        }
        Update: {
          bias_id?: string | null
          completed_at?: string
          created_at?: string
          hints_used?: number
          id?: string
          outcome_id?: string
          player_id?: string
          reflected?: boolean
          response_time_ms?: number
          scenario_id?: string
          selected_choice_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_bias_id_fkey"
            columns: ["bias_id"]
            isOneToOne: false
            referencedRelation: "biases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_selected_choice_id_fkey"
            columns: ["selected_choice_id"]
            isOneToOne: false
            referencedRelation: "scenario_choices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      bias_mastery: {
        Row: {
          bias_id: string
          correct_attempts: number
          created_at: string
          decays_at: string | null
          distinct_contexts: number
          id: string
          last_practiced_at: string | null
          mastery_level: number
          player_id: string
          total_attempts: number
          updated_at: string
        }
        Insert: {
          bias_id: string
          correct_attempts?: number
          created_at?: string
          decays_at?: string | null
          distinct_contexts?: number
          id?: string
          last_practiced_at?: string | null
          mastery_level?: number
          player_id: string
          total_attempts?: number
          updated_at?: string
        }
        Update: {
          bias_id?: string
          correct_attempts?: number
          created_at?: string
          decays_at?: string | null
          distinct_contexts?: number
          id?: string
          last_practiced_at?: string | null
          mastery_level?: number
          player_id?: string
          total_attempts?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bias_mastery_bias_id_fkey"
            columns: ["bias_id"]
            isOneToOne: false
            referencedRelation: "biases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bias_mastery_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      biases: {
        Row: {
          category_id: string | null
          counter_strategy: string | null
          created_at: string
          deleted_at: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          full_explanation: string | null
          id: string
          name: string
          short_description: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          counter_strategy?: string | null
          created_at?: string
          deleted_at?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          full_explanation?: string | null
          id?: string
          name: string
          short_description?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          counter_strategy?: string | null
          created_at?: string
          deleted_at?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          full_explanation?: string | null
          id?: string
          name?: string
          short_description?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "biases_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      levels: {
        Row: {
          created_at: string
          id: string
          level_number: number
          title: string
          unlocks: Json
          updated_at: string
          xp_required: number
        }
        Insert: {
          created_at?: string
          id?: string
          level_number: number
          title: string
          unlocks?: Json
          updated_at?: string
          xp_required: number
        }
        Update: {
          created_at?: string
          id?: string
          level_number?: number
          title?: string
          unlocks?: Json
          updated_at?: string
          xp_required?: number
        }
        Relationships: []
      }
      outcomes: {
        Row: {
          choice_id: string
          created_at: string
          deleted_at: string | null
          explanation: string
          id: string
          is_correct: boolean
          result_text: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          choice_id: string
          created_at?: string
          deleted_at?: string | null
          explanation: string
          id?: string
          is_correct?: boolean
          result_text: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          choice_id?: string
          created_at?: string
          deleted_at?: string | null
          explanation?: string
          id?: string
          is_correct?: boolean
          result_text?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "outcomes_choice_id_fkey"
            columns: ["choice_id"]
            isOneToOne: true
            referencedRelation: "scenario_choices"
            referencedColumns: ["id"]
          },
        ]
      }
      player_achievements: {
        Row: {
          achievement_id: string
          created_at: string
          id: string
          player_id: string
          progress_snapshot: Json
          unlocked_at: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          id?: string
          player_id: string
          progress_snapshot?: Json
          unlocked_at?: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          id?: string
          player_id?: string
          progress_snapshot?: Json
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_achievements_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          display_name: string | null
          id: string
          is_public: boolean
          locale: string
          notification_prefs: Json
          onboarded_at: string | null
          theme: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          id: string
          is_public?: boolean
          locale?: string
          notification_prefs?: Json
          onboarded_at?: string | null
          theme?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          id?: string
          is_public?: boolean
          locale?: string
          notification_prefs?: Json
          onboarded_at?: string | null
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      progress: {
        Row: {
          created_at: string
          current_level: number
          current_xp: number
          id: string
          last_activity_at: string | null
          overall_accuracy: number
          player_id: string
          scenarios_completed: number
          total_xp: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_level?: number
          current_xp?: number
          id?: string
          last_activity_at?: string | null
          overall_accuracy?: number
          player_id: string
          scenarios_completed?: number
          total_xp?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_level?: number
          current_xp?: number
          id?: string
          last_activity_at?: string | null
          overall_accuracy?: number
          player_id?: string
          scenarios_completed?: number
          total_xp?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reflections: {
        Row: {
          attempt_id: string
          confidence_after: number | null
          confidence_before: number | null
          created_at: string
          id: string
          player_id: string
          prompt: string | null
          reflection_text: string
        }
        Insert: {
          attempt_id: string
          confidence_after?: number | null
          confidence_before?: number | null
          created_at?: string
          id?: string
          player_id: string
          prompt?: string | null
          reflection_text: string
        }
        Update: {
          attempt_id?: string
          confidence_after?: number | null
          confidence_before?: number | null
          created_at?: string
          id?: string
          player_id?: string
          prompt?: string | null
          reflection_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "reflections_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reflections_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_biases: {
        Row: {
          bias_id: string
          created_at: string
          id: string
          scenario_id: string
        }
        Insert: {
          bias_id: string
          created_at?: string
          id?: string
          scenario_id: string
        }
        Update: {
          bias_id?: string
          created_at?: string
          id?: string
          scenario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_biases_bias_id_fkey"
            columns: ["bias_id"]
            isOneToOne: false
            referencedRelation: "biases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_biases_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_choices: {
        Row: {
          bias_id: string | null
          body: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_trap: boolean
          label: string
          scenario_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          bias_id?: string | null
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_trap?: boolean
          label: string
          scenario_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          bias_id?: string | null
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_trap?: boolean
          label?: string
          scenario_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_choices_bias_id_fkey"
            columns: ["bias_id"]
            isOneToOne: false
            referencedRelation: "biases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_choices_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_pack_items: {
        Row: {
          created_at: string
          id: string
          pack_id: string
          scenario_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          pack_id: string
          scenario_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          pack_id?: string
          scenario_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "scenario_pack_items_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "scenario_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_pack_items_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_packs: {
        Row: {
          cover_image: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_published: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      scenarios: {
        Row: {
          category_id: string | null
          context: string
          created_at: string
          deleted_at: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          id: string
          slug: string
          source: Database["public"]["Enums"]["scenario_source"]
          stakes: string | null
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          category_id?: string | null
          context: string
          created_at?: string
          deleted_at?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          slug: string
          source?: Database["public"]["Enums"]["scenario_source"]
          stakes?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          category_id?: string | null
          context?: string
          created_at?: string
          deleted_at?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          slug?: string
          source?: Database["public"]["Enums"]["scenario_source"]
          stakes?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          completed: boolean
          created_at: string
          ended_at: string | null
          id: string
          player_id: string
          source: Database["public"]["Enums"]["session_source"]
          started_at: string
          summary: Json
          total_attempts: number
          total_xp_earned: number
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          player_id: string
          source?: Database["public"]["Enums"]["session_source"]
          started_at?: string
          summary?: Json
          total_attempts?: number
          total_xp_earned?: number
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          player_id?: string
          source?: Database["public"]["Enums"]["session_source"]
          started_at?: string
          summary?: Json
          total_attempts?: number
          total_xp_earned?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      statistics: {
        Row: {
          average_response_time_ms: number
          computed_at: string | null
          created_at: string
          id: string
          last_played_at: string | null
          metrics: Json
          player_id: string
          total_attempts: number
          total_play_time_ms: number
          total_reflections: number
          total_sessions: number
          updated_at: string
        }
        Insert: {
          average_response_time_ms?: number
          computed_at?: string | null
          created_at?: string
          id?: string
          last_played_at?: string | null
          metrics?: Json
          player_id: string
          total_attempts?: number
          total_play_time_ms?: number
          total_reflections?: number
          total_sessions?: number
          updated_at?: string
        }
        Update: {
          average_response_time_ms?: number
          computed_at?: string | null
          created_at?: string
          id?: string
          last_played_at?: string | null
          metrics?: Json
          player_id?: string
          total_attempts?: number
          total_play_time_ms?: number
          total_reflections?: number
          total_sessions?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "statistics_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      streaks: {
        Row: {
          created_at: string
          current_streak: number
          grace_used: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          player_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          grace_used?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          player_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          grace_used?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          player_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "streaks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_transactions: {
        Row: {
          amount: number
          attempt_id: string | null
          created_at: string
          id: string
          player_id: string
          reason: string
          source: Database["public"]["Enums"]["xp_source"]
          source_ref_id: string | null
        }
        Insert: {
          amount: number
          attempt_id?: string | null
          created_at?: string
          id?: string
          player_id: string
          reason: string
          source: Database["public"]["Enums"]["xp_source"]
          source_ref_id?: string | null
        }
        Update: {
          amount?: number
          attempt_id?: string | null
          created_at?: string
          id?: string
          player_id?: string
          reason?: string
          source?: Database["public"]["Enums"]["xp_source"]
          source_ref_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_transactions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_attempt_xp: { Args: { p_attempt_id: string }; Returns: Json }
      award_reflection_xp: { Args: { p_attempt_id: string }; Returns: Json }
      bias_mastery_ceiling: {
        Args: { p_distinct_contexts: number }
        Returns: number
      }
      bias_mastery_rate: {
        Args: {
          p_calibrated: boolean
          p_hours_since_previous: number
          p_is_correct: boolean
          p_is_repeat_context: boolean
          p_reflected: boolean
        }
        Returns: number
      }
      level_for_total_xp: {
        Args: { p_total_xp: number }
        Returns: {
          current_xp: number
          level_number: number
          level_span: number
          level_title: string
        }[]
      }
      progression_snapshot: {
        Args: {
          p_awarded: number
          p_awarded_now: boolean
          p_previous_level: number
          p_progress: Database["public"]["Tables"]["progress"]["Row"]
          p_session_xp: number
        }
        Returns: Json
      }
      record_xp: {
        Args: {
          p_amount: number
          p_attempt_id?: string
          p_player_id: string
          p_reason: string
          p_source: Database["public"]["Enums"]["xp_source"]
          p_source_ref_id?: string
        }
        Returns: {
          created_at: string
          current_level: number
          current_xp: number
          id: string
          last_activity_at: string | null
          overall_accuracy: number
          player_id: string
          scenarios_completed: number
          total_xp: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      refresh_attempt_mastery: {
        Args: { p_attempt_id: string; p_player_id: string }
        Returns: Json
      }
      refresh_bias_mastery: {
        Args: { p_bias_id: string; p_player_id: string }
        Returns: {
          bias_id: string
          correct_attempts: number
          created_at: string
          decays_at: string | null
          distinct_contexts: number
          id: string
          last_practiced_at: string | null
          mastery_level: number
          player_id: string
          total_attempts: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bias_mastery"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      refresh_player_progress: {
        Args: { p_player_id: string }
        Returns: {
          created_at: string
          current_level: number
          current_xp: number
          id: string
          last_activity_at: string | null
          overall_accuracy: number
          player_id: string
          scenarios_completed: number
          total_xp: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      refresh_session_rollups: {
        Args: { p_session_id: string }
        Returns: number
      }
    }
    Enums: {
      content_status: "draft" | "published" | "archived"
      difficulty_level: "easy" | "medium" | "hard" | "expert"
      scenario_source: "authored" | "ai_generated"
      session_source: "free_play"
      xp_source: "attempt" | "achievement" | "streak" | "bonus"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      content_status: ["draft", "published", "archived"],
      difficulty_level: ["easy", "medium", "hard", "expert"],
      scenario_source: ["authored", "ai_generated"],
      session_source: ["free_play"],
      xp_source: ["attempt", "achievement", "streak", "bonus"],
    },
  },
} as const

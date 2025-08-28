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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      embed_analytics: {
        Row: {
          created_at: string
          duration_watched: number | null
          embed_token: string | null
          id: string
          ip_address: unknown | null
          last_viewed_at: string
          referrer_domain: string | null
          user_agent: string | null
          video_id: string
          view_count: number | null
        }
        Insert: {
          created_at?: string
          duration_watched?: number | null
          embed_token?: string | null
          id?: string
          ip_address?: unknown | null
          last_viewed_at?: string
          referrer_domain?: string | null
          user_agent?: string | null
          video_id: string
          view_count?: number | null
        }
        Update: {
          created_at?: string
          duration_watched?: number | null
          embed_token?: string | null
          id?: string
          ip_address?: unknown | null
          last_viewed_at?: string
          referrer_domain?: string | null
          user_agent?: string | null
          video_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      emotion_spans: {
        Row: {
          confidence: number | null
          created_at: string
          emotion: string
          end_time: number
          id: string
          intensity: number | null
          intent: string | null
          start_time: number
          video_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          emotion: string
          end_time: number
          id?: string
          intensity?: number | null
          intent?: string | null
          start_time: number
          video_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          emotion?: string
          end_time?: number
          id?: string
          intensity?: number | null
          intent?: string | null
          start_time?: number
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emotion_spans_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          payload: Json | null
          result: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          type: Database["public"]["Enums"]["job_type"]
          video_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json | null
          result?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          type: Database["public"]["Enums"]["job_type"]
          video_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json | null
          result?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          type?: Database["public"]["Enums"]["job_type"]
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tracks: {
        Row: {
          created_at: string
          format: string | null
          id: string
          is_default: boolean | null
          kind: Database["public"]["Enums"]["track_kind"]
          label: string | null
          language: string | null
          metadata: Json | null
          url: string
          video_id: string
        }
        Insert: {
          created_at?: string
          format?: string | null
          id?: string
          is_default?: boolean | null
          kind: Database["public"]["Enums"]["track_kind"]
          label?: string | null
          language?: string | null
          metadata?: Json | null
          url: string
          video_id: string
        }
        Update: {
          created_at?: string
          format?: string | null
          id?: string
          is_default?: boolean | null
          kind?: Database["public"]["Enums"]["track_kind"]
          label?: string | null
          language?: string | null
          metadata?: Json | null
          url?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracks_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      transcript_segments: {
        Row: {
          confidence: number | null
          created_at: string
          end_time: number
          id: string
          speaker: string | null
          start_time: number
          text: string
          video_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          end_time: number
          id?: string
          speaker?: string | null
          start_time: number
          text: string
          video_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          end_time?: number
          id?: string
          speaker?: string | null
          start_time?: number
          text?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcript_segments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          content_type: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          embed_domains: string[] | null
          embed_enabled: boolean
          embed_settings: Json | null
          embed_token: string | null
          id: string
          language: string
          metadata: Json | null
          status: Database["public"]["Enums"]["video_status"]
          storage_path: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          embed_domains?: string[] | null
          embed_enabled?: boolean
          embed_settings?: Json | null
          embed_token?: string | null
          id?: string
          language?: string
          metadata?: Json | null
          status?: Database["public"]["Enums"]["video_status"]
          storage_path?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          embed_domains?: string[] | null
          embed_enabled?: boolean
          embed_settings?: Json | null
          embed_token?: string | null
          id?: string
          language?: string
          metadata?: Json | null
          status?: Database["public"]["Enums"]["video_status"]
          storage_path?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_embed_token: {
        Args: { video_uuid: string }
        Returns: string
      }
      validate_embed_access: {
        Args: { referrer_domain?: string; token?: string; video_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      job_status: "pending" | "running" | "completed" | "failed"
      job_type:
        | "transcription"
        | "emotion_analysis"
        | "ad_generation"
        | "caption_generation"
        | "asl_generation"
      track_kind: "captions" | "subtitles" | "audio_description" | "asl_video"
      video_status: "uploading" | "uploaded" | "processing" | "ready" | "error"
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
      job_status: ["pending", "running", "completed", "failed"],
      job_type: [
        "transcription",
        "emotion_analysis",
        "ad_generation",
        "caption_generation",
        "asl_generation",
      ],
      track_kind: ["captions", "subtitles", "audio_description", "asl_video"],
      video_status: ["uploading", "uploaded", "processing", "ready", "error"],
    },
  },
} as const

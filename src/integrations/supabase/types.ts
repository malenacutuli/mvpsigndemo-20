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
      audio_descriptions: {
        Row: {
          confidence: number | null
          created_at: string
          description: string
          description_type: string | null
          end_time: number
          id: string
          language: string
          start_time: number
          updated_at: string
          video_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          description: string
          description_type?: string | null
          end_time: number
          id?: string
          language?: string
          start_time: number
          updated_at?: string
          video_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          description?: string
          description_type?: string | null
          end_time?: number
          id?: string
          language?: string
          start_time?: number
          updated_at?: string
          video_id?: string
        }
        Relationships: []
      }
      channel_subscriptions: {
        Row: {
          channel_id: string
          id: string
          subscribed_at: string
          subscriber_email: string | null
          subscriber_user_id: string | null
        }
        Insert: {
          channel_id: string
          id?: string
          subscribed_at?: string
          subscriber_email?: string | null
          subscriber_user_id?: string | null
        }
        Update: {
          channel_id?: string
          id?: string
          subscribed_at?: string
          subscriber_email?: string | null
          subscriber_user_id?: string | null
        }
        Relationships: []
      }
      channels: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          subscriber_count: number
          updated_at: string
          user_id: string
          video_count: number
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          subscriber_count?: number
          updated_at?: string
          user_id: string
          video_count?: number
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          subscriber_count?: number
          updated_at?: string
          user_id?: string
          video_count?: number
        }
        Relationships: []
      }
      characters: {
        Row: {
          color: string
          created_at: string
          emphasis: string | null
          id: string
          is_off_camera: boolean | null
          name: string
          pitch: string | null
          type: string
          updated_at: string
          video_id: string
          voice_id: string | null
          voice_name: string | null
          voice_type: string | null
        }
        Insert: {
          color: string
          created_at?: string
          emphasis?: string | null
          id?: string
          is_off_camera?: boolean | null
          name: string
          pitch?: string | null
          type: string
          updated_at?: string
          video_id: string
          voice_id?: string | null
          voice_name?: string | null
          voice_type?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          emphasis?: string | null
          id?: string
          is_off_camera?: boolean | null
          name?: string
          pitch?: string | null
          type?: string
          updated_at?: string
          video_id?: string
          voice_id?: string | null
          voice_name?: string | null
          voice_type?: string | null
        }
        Relationships: []
      }
      content_generation_cache: {
        Row: {
          content_type: string
          created_at: string
          generation_params: Json | null
          id: string
          language: string
          result_data: Json
          updated_at: string
          video_id: string
        }
        Insert: {
          content_type: string
          created_at?: string
          generation_params?: Json | null
          id?: string
          language?: string
          result_data: Json
          updated_at?: string
          video_id: string
        }
        Update: {
          content_type?: string
          created_at?: string
          generation_params?: Json | null
          id?: string
          language?: string
          result_data?: Json
          updated_at?: string
          video_id?: string
        }
        Relationships: []
      }
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
          id: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      public_video_views: {
        Row: {
          accessibility_features_used: Json | null
          created_at: string
          id: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          video_id: string
          view_duration_seconds: number | null
          viewer_ip: unknown | null
          watched_percentage: number | null
        }
        Insert: {
          accessibility_features_used?: Json | null
          created_at?: string
          id?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          video_id: string
          view_duration_seconds?: number | null
          viewer_ip?: unknown | null
          watched_percentage?: number | null
        }
        Update: {
          accessibility_features_used?: Json | null
          created_at?: string
          id?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          video_id?: string
          view_duration_seconds?: number | null
          viewer_ip?: unknown | null
          watched_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "public_video_views_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          action_type: string
          created_at: string
          error_message: string | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type: string
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          details: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          resource_id: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sign_language_clips: {
        Row: {
          clip_url: string
          created_at: string
          created_by: string | null
          end_time_ms: number
          id: string
          start_time_ms: number
          transcript_segment_id: string | null
          updated_at: string
          video_id: string
        }
        Insert: {
          clip_url: string
          created_at?: string
          created_by?: string | null
          end_time_ms: number
          id?: string
          start_time_ms: number
          transcript_segment_id?: string | null
          updated_at?: string
          video_id: string
        }
        Update: {
          clip_url?: string
          created_at?: string
          created_by?: string | null
          end_time_ms?: number
          id?: string
          start_time_ms?: number
          transcript_segment_id?: string | null
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sign_language_clips_transcript_segment_id_fkey"
            columns: ["transcript_segment_id"]
            isOneToOne: false
            referencedRelation: "transcript_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      speaker_mappings: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          language: string
          mappings: Json
          updated_at: string
          video_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string
          mappings?: Json
          updated_at?: string
          video_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string
          mappings?: Json
          updated_at?: string
          video_id?: string
        }
        Relationships: []
      }
      subscriber_access_audit: {
        Row: {
          access_type: string
          accessed_fields: string[] | null
          accessed_subscriber_id: string
          created_at: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_type: string
          accessed_fields?: string[] | null
          accessed_subscriber_id: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_type?: string
          accessed_fields?: string[] | null
          accessed_subscriber_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_access_audit: {
        Row: {
          access_type: string
          channel_id: string | null
          created_at: string
          id: string
          ip_address: unknown | null
          user_id: string | null
        }
        Insert: {
          access_type: string
          channel_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          user_id?: string | null
        }
        Update: {
          access_type?: string
          channel_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          user_id?: string | null
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
          emphasis: string | null
          end_time: number
          id: string
          idx: number | null
          is_off_camera: boolean | null
          language: string
          pitch: string | null
          segment_type: string | null
          speaker: string | null
          speaker_color: string | null
          start_time: number
          text: string
          transcript_id: string | null
          video_id: string
          words: Json | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          emphasis?: string | null
          end_time: number
          id?: string
          idx?: number | null
          is_off_camera?: boolean | null
          language?: string
          pitch?: string | null
          segment_type?: string | null
          speaker?: string | null
          speaker_color?: string | null
          start_time: number
          text: string
          transcript_id?: string | null
          video_id: string
          words?: Json | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          emphasis?: string | null
          end_time?: number
          id?: string
          idx?: number | null
          is_off_camera?: boolean | null
          language?: string
          pitch?: string | null
          segment_type?: string | null
          speaker?: string | null
          speaker_color?: string | null
          start_time?: number
          text?: string
          transcript_id?: string | null
          video_id?: string
          words?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "transcript_segments_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "transcripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcript_segments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      transcripts: {
        Row: {
          checksum: string | null
          created_by: string
          id: string
          language: string
          updated_at: string
          video_id: string
        }
        Insert: {
          checksum?: string | null
          created_by: string
          id?: string
          language: string
          updated_at?: string
          video_id: string
        }
        Update: {
          checksum?: string | null
          created_by?: string
          id?: string
          language?: string
          updated_at?: string
          video_id?: string
        }
        Relationships: []
      }
      twelve_labs_mappings: {
        Row: {
          asset_id: string
          created_at: string
          error_message: string | null
          id: string
          index_id: string | null
          metadata: Json | null
          status: string
          task_id: string | null
          tl_video_id: string | null
          updated_at: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          index_id?: string | null
          metadata?: Json | null
          status?: string
          task_id?: string | null
          tl_video_id?: string | null
          updated_at?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          index_id?: string | null
          metadata?: Json | null
          status?: string
          task_id?: string | null
          tl_video_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "twelve_labs_mappings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_analysis_results: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          language: string | null
          prompt: string
          result: Json
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          language?: string | null
          prompt: string
          result: Json
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          language?: string | null
          prompt?: string
          result?: Json
        }
        Relationships: [
          {
            foreignKeyName: "video_analysis_results_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          channel_id: string | null
          content_type: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          embed_domains: string[] | null
          embed_enabled: boolean
          embed_settings: Json | null
          embed_token: string | null
          id: string
          is_public: boolean
          language: string
          metadata: Json | null
          published_at: string | null
          status: Database["public"]["Enums"]["video_status"]
          storage_path: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          channel_id?: string | null
          content_type?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          embed_domains?: string[] | null
          embed_enabled?: boolean
          embed_settings?: Json | null
          embed_token?: string | null
          id?: string
          is_public?: boolean
          language?: string
          metadata?: Json | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["video_status"]
          storage_path?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          channel_id?: string | null
          content_type?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          embed_domains?: string[] | null
          embed_enabled?: boolean
          embed_settings?: Json | null
          embed_token?: string | null
          id?: string
          is_public?: boolean
          language?: string
          metadata?: Json | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["video_status"]
          storage_path?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          view_count?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_masked_subscription_data: {
        Args: { target_user_id?: string }
        Returns: {
          created_at: string
          email_masked: string
          stripe_id_masked: string
          subscribed: boolean
          subscription_end: string
          subscription_tier: string
          user_id: string
        }[]
      }
      anonymize_ip_address: {
        Args: { ip_addr: unknown }
        Returns: unknown
      }
      anonymize_user_agent: {
        Args: { user_agent_str: string }
        Returns: string
      }
      check_my_subscription_status: {
        Args: { channel_uuid: string }
        Returns: {
          is_subscribed: boolean
          subscribed_at: string
        }[]
      }
      check_user_subscription: {
        Args: { channel_uuid: string }
        Returns: {
          subscribed: boolean
          subscription_date: string
        }[]
      }
      check_user_subscription_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          is_subscribed: boolean
          subscription_end: string
          subscription_tier: string
        }[]
      }
      cleanup_old_analytics_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_subscription_audit_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      detect_suspicious_subscription_access: {
        Args: { accessing_user_id: string }
        Returns: undefined
      }
      generate_embed_token: {
        Args: { video_uuid: string }
        Returns: string
      }
      get_current_user_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_masked_subscriber_data: {
        Args: { target_user_id?: string }
        Returns: {
          created_date: string
          is_active: boolean
          masked_stripe_id: string
          tier: string
          user_id: string
        }[]
      }
      get_secure_channel_stats: {
        Args: { channel_uuid: string }
        Returns: {
          auth_subscriber_count: number
          email_subscriber_count: number
          latest_subscription: string
          total_subscribers: number
        }[]
      }
      get_secure_channel_subscriber_stats: {
        Args: { channel_uuid: string }
        Returns: {
          authenticated_subscriber_count: number
          email_subscriber_count: number
          latest_subscription_date: string
          total_subscribers: number
        }[]
      }
      get_secure_subscription_info: {
        Args: Record<PropertyKey, never>
        Returns: {
          expires_at: string
          features_available: Json
          is_active: boolean
          tier_name: string
        }[]
      }
      get_user_subscription_info: {
        Args: Record<PropertyKey, never>
        Returns: {
          expires_at: string
          features_available: Json
          is_active: boolean
          tier_name: string
        }[]
      }
      increment_video_views: {
        Args: { video_uuid: string }
        Returns: undefined
      }
      mask_stripe_customer_id: {
        Args: { customer_id: string }
        Returns: string
      }
      secure_check_subscription_status_v2: {
        Args: { channel_uuid: string }
        Returns: boolean
      }
      secure_get_channel_stats_v2: {
        Args: { channel_uuid: string }
        Returns: {
          latest_subscription_date: string
          total_subscribers: number
        }[]
      }
      system_get_stripe_customer_for_webhook: {
        Args: { user_email: string }
        Returns: string
      }
      system_manage_subscription: {
        Args: {
          end_date?: string
          is_active?: boolean
          stripe_customer?: string
          target_user_id: string
          tier?: string
        }
        Returns: boolean
      }
      update_user_subscription_preferences: {
        Args: { email_notifications?: boolean }
        Returns: boolean
      }
      upsert_transcript_segments: {
        Args: {
          p_checksum?: string
          p_created_by: string
          p_language: string
          p_segments: Json
          p_video_id: string
        }
        Returns: undefined
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

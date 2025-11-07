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
      api_cost_tracking: {
        Row: {
          api_endpoint: string
          cost_usd: number
          created_at: string | null
          id: string
          metadata: Json | null
          service_name: string
          unit_type: string | null
          usage_units: number | null
          user_id: string
          video_id: string | null
        }
        Insert: {
          api_endpoint: string
          cost_usd?: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          service_name: string
          unit_type?: string | null
          usage_units?: number | null
          user_id: string
          video_id?: string | null
        }
        Update: {
          api_endpoint?: string
          cost_usd?: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          service_name?: string
          unit_type?: string | null
          usage_units?: number | null
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_cost_tracking_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_descriptions: {
        Row: {
          audio_error_message: string | null
          audio_generated_at: string | null
          audio_generation_status: string | null
          audio_url: string | null
          confidence: number | null
          created_at: string
          description: string
          description_type: string | null
          end_time: number
          estimated_duration: number | null
          extension_duration: number | null
          extension_type: string | null
          gap_duration: number | null
          id: string
          is_translation: boolean | null
          language: string
          priority_level: string | null
          requires_extension: boolean | null
          source_description_id: string | null
          start_time: number
          translation_quality_score: number | null
          updated_at: string
          video_id: string
          voice_id: string | null
          voice_name: string | null
        }
        Insert: {
          audio_error_message?: string | null
          audio_generated_at?: string | null
          audio_generation_status?: string | null
          audio_url?: string | null
          confidence?: number | null
          created_at?: string
          description: string
          description_type?: string | null
          end_time: number
          estimated_duration?: number | null
          extension_duration?: number | null
          extension_type?: string | null
          gap_duration?: number | null
          id?: string
          is_translation?: boolean | null
          language?: string
          priority_level?: string | null
          requires_extension?: boolean | null
          source_description_id?: string | null
          start_time: number
          translation_quality_score?: number | null
          updated_at?: string
          video_id: string
          voice_id?: string | null
          voice_name?: string | null
        }
        Update: {
          audio_error_message?: string | null
          audio_generated_at?: string | null
          audio_generation_status?: string | null
          audio_url?: string | null
          confidence?: number | null
          created_at?: string
          description?: string
          description_type?: string | null
          end_time?: number
          estimated_duration?: number | null
          extension_duration?: number | null
          extension_type?: string | null
          gap_duration?: number | null
          id?: string
          is_translation?: boolean | null
          language?: string
          priority_level?: string | null
          requires_extension?: boolean | null
          source_description_id?: string | null
          start_time?: number
          translation_quality_score?: number | null
          updated_at?: string
          video_id?: string
          voice_id?: string | null
          voice_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audio_descriptions_source_description_id_fkey"
            columns: ["source_description_id"]
            isOneToOne: false
            referencedRelation: "audio_descriptions"
            referencedColumns: ["id"]
          },
        ]
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
      cwi_palette: {
        Row: {
          hex: string
          idx: number
          pool: string
        }
        Insert: {
          hex: string
          idx: number
          pool: string
        }
        Update: {
          hex?: string
          idx?: number
          pool?: string
        }
        Relationships: []
      }
      embed_analytics: {
        Row: {
          created_at: string
          duration_watched: number | null
          embed_token: string | null
          id: string
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
      export_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          export_options: Json | null
          id: string
          output_key: string | null
          output_url: string | null
          progress: number | null
          started_at: string | null
          status: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          export_options?: Json | null
          id?: string
          output_key?: string | null
          output_url?: string | null
          progress?: number | null
          started_at?: string | null
          status?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          export_options?: Json | null
          id?: string
          output_key?: string | null
          output_url?: string | null
          progress?: number | null
          started_at?: string | null
          status?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_jobs_video_id_fkey"
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
      migration_log: {
        Row: {
          affected_rows: number | null
          executed_at: string | null
          id: string
          migration_name: string
          notes: string | null
        }
        Insert: {
          affected_rows?: number | null
          executed_at?: string | null
          id?: string
          migration_name: string
          notes?: string | null
        }
        Update: {
          affected_rows?: number | null
          executed_at?: string | null
          id?: string
          migration_name?: string
          notes?: string | null
        }
        Relationships: []
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
          viewer_ip: unknown
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
          viewer_ip?: unknown
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
          viewer_ip?: unknown
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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
          ip_address: unknown
          resource_id: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          resource_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
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
        Relationships: []
      }
      speaker_mappings: {
        Row: {
          language: string
          mappings: Json
          video_id: string
        }
        Insert: {
          language: string
          mappings?: Json
          video_id: string
        }
        Update: {
          language?: string
          mappings?: Json
          video_id?: string
        }
        Relationships: []
      }
      subscriber_access_audit: {
        Row: {
          access_type: string
          accessed_fields: string[] | null
          accessed_subscriber_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_type: string
          accessed_fields?: string[] | null
          accessed_subscriber_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_type?: string
          accessed_fields?: string[] | null
          accessed_subscriber_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          billing_cycle_start: string | null
          created_at: string
          email: string
          id: string
          last_usage_reset: string | null
          minutes_included: number | null
          minutes_used: number | null
          storage_limit_gb: number | null
          storage_used_gb: number | null
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle_start?: string | null
          created_at?: string
          email: string
          id?: string
          last_usage_reset?: string | null
          minutes_included?: number | null
          minutes_used?: number | null
          storage_limit_gb?: number | null
          storage_used_gb?: number | null
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle_start?: string | null
          created_at?: string
          email?: string
          id?: string
          last_usage_reset?: string | null
          minutes_included?: number | null
          minutes_used?: number | null
          storage_limit_gb?: number | null
          storage_used_gb?: number | null
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
          ip_address: unknown
          user_id: string | null
        }
        Insert: {
          access_type: string
          channel_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          user_id?: string | null
        }
        Update: {
          access_type?: string
          channel_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
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
      transcript_freeze: {
        Row: {
          frozen_at: string
          id: string
          language: string
          video_id: string
        }
        Insert: {
          frozen_at?: string
          id?: string
          language?: string
          video_id: string
        }
        Update: {
          frozen_at?: string
          id?: string
          language?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcript_freeze_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      transcript_segments: {
        Row: {
          character_id: string | null
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
          character_id?: string | null
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
          character_id?: string | null
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
            foreignKeyName: "transcript_segments_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
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
      transcript_segments_clean: {
        Row: {
          character_id: string | null
          confidence: number | null
          created_at: string
          emphasis: string | null
          end_time: number
          id: string
          idx: number | null
          is_music: boolean | null
          is_off_camera: boolean | null
          is_sound_effect: boolean | null
          language: string
          pitch: string | null
          segment_type: string | null
          speaker: string | null
          speaker_asr_label: string | null
          speaker_asr_norm: string | null
          speaker_color: string | null
          speaker_norm: string | null
          speaker_normalized: string | null
          start_time: number
          text: string
          transcript_id: string | null
          video_id: string
          vocal_intensity: string | null
          words: Json | null
        }
        Insert: {
          character_id?: string | null
          confidence?: number | null
          created_at?: string
          emphasis?: string | null
          end_time: number
          id?: string
          idx?: number | null
          is_music?: boolean | null
          is_off_camera?: boolean | null
          is_sound_effect?: boolean | null
          language?: string
          pitch?: string | null
          segment_type?: string | null
          speaker?: string | null
          speaker_asr_label?: string | null
          speaker_asr_norm?: string | null
          speaker_color?: string | null
          speaker_norm?: string | null
          speaker_normalized?: string | null
          start_time: number
          text: string
          transcript_id?: string | null
          video_id: string
          vocal_intensity?: string | null
          words?: Json | null
        }
        Update: {
          character_id?: string | null
          confidence?: number | null
          created_at?: string
          emphasis?: string | null
          end_time?: number
          id?: string
          idx?: number | null
          is_music?: boolean | null
          is_off_camera?: boolean | null
          is_sound_effect?: boolean | null
          language?: string
          pitch?: string | null
          segment_type?: string | null
          speaker?: string | null
          speaker_asr_label?: string | null
          speaker_asr_norm?: string | null
          speaker_color?: string | null
          speaker_norm?: string | null
          speaker_normalized?: string | null
          start_time?: number
          text?: string
          transcript_id?: string | null
          video_id?: string
          vocal_intensity?: string | null
          words?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "transcript_segments_clean_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcript_segments_clean_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "transcripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcript_segments_clean_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      transcription_test_results: {
        Row: {
          api_key_used: string | null
          avg_confidence: number | null
          created_at: string | null
          estimated_cost_usd: number | null
          has_word_timings: boolean | null
          id: string
          language: string | null
          processing_time_ms: number | null
          provider: string
          raw_result: Json | null
          segment_count: number | null
          speaker_count: number | null
          video_duration_sec: number | null
          video_id: string
          video_size_mb: number | null
          word_count: number | null
        }
        Insert: {
          api_key_used?: string | null
          avg_confidence?: number | null
          created_at?: string | null
          estimated_cost_usd?: number | null
          has_word_timings?: boolean | null
          id?: string
          language?: string | null
          processing_time_ms?: number | null
          provider: string
          raw_result?: Json | null
          segment_count?: number | null
          speaker_count?: number | null
          video_duration_sec?: number | null
          video_id: string
          video_size_mb?: number | null
          word_count?: number | null
        }
        Update: {
          api_key_used?: string | null
          avg_confidence?: number | null
          created_at?: string | null
          estimated_cost_usd?: number | null
          has_word_timings?: boolean | null
          id?: string
          language?: string | null
          processing_time_ms?: number | null
          provider?: string
          raw_result?: Json | null
          segment_count?: number | null
          speaker_count?: number | null
          video_duration_sec?: number | null
          video_id?: string
          video_size_mb?: number | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transcription_test_results_video_id_fkey"
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
      usage_notifications: {
        Row: {
          billing_cycle_start: string
          created_at: string
          id: string
          notification_type: string
          sent_at: string
          usage_snapshot: Json
          user_id: string
        }
        Insert: {
          billing_cycle_start: string
          created_at?: string
          id?: string
          notification_type: string
          sent_at?: string
          usage_snapshot: Json
          user_id: string
        }
        Update: {
          billing_cycle_start?: string
          created_at?: string
          id?: string
          notification_type?: string
          sent_at?: string
          usage_snapshot?: Json
          user_id?: string
        }
        Relationships: []
      }
      usage_records: {
        Row: {
          billing_cycle_start: string
          cost_eur: number | null
          created_at: string | null
          id: string
          metadata: Json | null
          minutes_processed: number
          processing_type: string
          user_id: string
          video_id: string | null
        }
        Insert: {
          billing_cycle_start: string
          cost_eur?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          minutes_processed: number
          processing_type: string
          user_id: string
          video_id?: string | null
        }
        Update: {
          billing_cycle_start?: string
          cost_eur?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          minutes_processed?: number
          processing_type?: string
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_records_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ead_preferences: {
        Row: {
          auto_resume: boolean | null
          created_at: string | null
          ead_enabled: boolean | null
          extension_strategy: string | null
          max_extension_duration: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_resume?: boolean | null
          created_at?: string | null
          ead_enabled?: boolean | null
          extension_strategy?: string | null
          max_extension_duration?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_resume?: boolean | null
          created_at?: string | null
          ead_enabled?: boolean | null
          extension_strategy?: string | null
          max_extension_duration?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      video_exports: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          export_options: Json
          file_size_bytes: number | null
          id: string
          status: string
          storage_path: string
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          export_options?: Json
          file_size_bytes?: number | null
          id?: string
          status?: string
          storage_path: string
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          export_options?: Json
          file_size_bytes?: number | null
          id?: string
          status?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_exports_video_id_fkey"
            columns: ["video_id"]
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
      v_transcript_segments_resolved: {
        Row: {
          character_color: string | null
          character_id: string | null
          character_name: string | null
          character_type: string | null
          color_seed: string | null
          display_color: string | null
          display_pool: string | null
          display_speaker: string | null
          end_time: number | null
          id: string | null
          idx: number | null
          language: string | null
          slot: number | null
          speaker: string | null
          speaker_asr_label: string | null
          start_time: number | null
          text: string | null
          video_id: string | null
          words: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "transcript_segments_clean_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
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
      admin_get_subscriber_list: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          is_active: boolean
          minutes_included: number
          minutes_used: number
          storage_limit_gb: number
          storage_used_gb: number
          subscription_end: string
          subscription_tier: string
          user_id: string
        }[]
      }
      anonymize_ip_address: { Args: { ip_addr: unknown }; Returns: unknown }
      anonymize_user_agent: {
        Args: { user_agent_str: string }
        Returns: string
      }
      apply_character_mappings_atomic: {
        Args: {
          p_language: string
          p_mappings: Json
          p_respect_manual?: boolean
          p_video_id: string
        }
        Returns: number
      }
      apply_specific_mapping: {
        Args: {
          p_asr_label: string
          p_character_id: string
          p_language: string
          p_video_id: string
        }
        Returns: undefined
      }
      can_process_video: {
        Args: { target_user_id: string; video_duration_seconds: number }
        Returns: Json
      }
      check_and_notify_overages: {
        Args: never
        Returns: {
          email: string
          estimated_cost: number
          overage_minutes: number
          tier: string
          user_id: string
        }[]
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
        Args: never
        Returns: {
          is_subscribed: boolean
          subscription_end: string
          subscription_tier: string
        }[]
      }
      cleanup_old_analytics_data: { Args: never; Returns: undefined }
      cleanup_subscription_audit_data: { Args: never; Returns: undefined }
      color_slot: {
        Args: { p_key: string; p_mod: number; p_seed: string }
        Returns: number
      }
      consolidate_video_speakers: {
        Args: { target_language?: string; target_video_id: string }
        Returns: Json
      }
      create_character_if_missing: {
        Args: {
          p_color?: string
          p_name: string
          p_type?: string
          p_video_id: string
        }
        Returns: string
      }
      detect_suspicious_subscription_access: {
        Args: { accessing_user_id: string }
        Returns: undefined
      }
      ensure_speaker_mappings_row: {
        Args: { p_language: string; p_video_id: string }
        Returns: undefined
      }
      freeze_transcript: {
        Args: { p_language: string; p_video_id: string }
        Returns: undefined
      }
      generate_embed_token: { Args: { video_uuid: string }; Returns: string }
      get_current_usage: {
        Args: { target_user_id: string }
        Returns: {
          minutes_included: number
          minutes_remaining: number
          minutes_used: number
          overage_rate_eur: number
          storage_limit_gb: number
          storage_remaining_gb: number
          storage_used_gb: number
          tier: string
        }[]
      }
      get_current_user_email: { Args: never; Returns: string }
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
      get_notification_history: {
        Args: { days_back?: number; target_user_id: string }
        Returns: {
          billing_cycle_start: string
          id: string
          notification_type: string
          sent_at: string
          usage_snapshot: Json
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
        Args: never
        Returns: {
          expires_at: string
          features_available: Json
          is_active: boolean
          tier_name: string
        }[]
      }
      get_subscriber_stats: {
        Args: never
        Returns: {
          active_subscribers: number
          advanced_tier_count: number
          free_tier_count: number
          standard_tier_count: number
          starter_tier_count: number
          total_minutes_used: number
          total_storage_used_gb: number
          total_subscribers: number
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: {
          granted_at: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_user_storage_usage: {
        Args: { target_user_id: string }
        Returns: {
          files_count: number
          is_near_limit: boolean
          is_over_limit: boolean
          storage_limit_bytes: number
          storage_used_bytes: number
          tier: string
          usage_percentage: number
        }[]
      }
      get_user_subscription_info: {
        Args: never
        Returns: {
          expires_at: string
          features_available: Json
          is_active: boolean
          tier_name: string
        }[]
      }
      get_users_approaching_limits: {
        Args: never
        Returns: {
          billing_cycle_start: string
          email: string
          minutes_included: number
          minutes_percent: number
          minutes_used: number
          storage_limit_gb: number
          storage_percent: number
          storage_used_gb: number
          tier: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_video_views: {
        Args: { video_uuid: string }
        Returns: undefined
      }
      is_frozen: {
        Args: { p_language: string; p_video_id: string }
        Returns: boolean
      }
      is_test_user: { Args: { user_email: string }; Returns: boolean }
      mask_stripe_customer_id: {
        Args: { customer_id: string }
        Returns: string
      }
      record_notification_sent: {
        Args: { notif_type: string; target_user_id: string; usage_data: Json }
        Returns: string
      }
      reset_monthly_usage: {
        Args: never
        Returns: {
          reset_count: number
          user_ids: string[]
        }[]
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
      should_send_notification: {
        Args: { notif_type: string; target_user_id: string }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      sync_character_to_segments: {
        Args: { p_character_id: string; p_language: string; p_video_id: string }
        Returns: number
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
      track_api_cost: {
        Args: {
          p_api_endpoint: string
          p_cost_usd: number
          p_metadata?: Json
          p_service_name: string
          p_unit_type?: string
          p_usage_units?: number
          p_user_id: string
          p_video_id: string
        }
        Returns: string
      }
      track_video_processing_usage: {
        Args: {
          meta?: Json
          minutes_to_add: number
          proc_type: string
          target_user_id: string
          video_uuid: string
        }
        Returns: Json
      }
      update_segment_identity: {
        Args: {
          p_character_id?: string
          p_character_name?: string
          p_idx?: number
          p_language?: string
          p_segment_id?: string
          p_video_id?: string
        }
        Returns: boolean
      }
      update_user_subscription_preferences: {
        Args: { email_notifications?: boolean }
        Returns: boolean
      }
      update_words_only: {
        Args: {
          p_end_time: number
          p_idx: number
          p_language: string
          p_start_time: number
          p_text: string
          p_video_id: string
          p_words: Json
        }
        Returns: undefined
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
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
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

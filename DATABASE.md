# Database Documentation

## 🗃️ Database Schema Overview

Axessible uses PostgreSQL via Supabase with Row-Level Security (RLS) for secure, scalable data management. The schema is designed around accessibility-first principles with comprehensive audit logging and privacy protection.

## 📊 Core Tables

### 🎥 Videos Table
**Primary content table storing video metadata and settings**

```sql
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  content_type TEXT DEFAULT 'education',
  status video_status NOT NULL DEFAULT 'uploading',
  storage_path TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  view_count INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT false,
  channel_id UUID,
  published_at TIMESTAMPTZ,
  embed_enabled BOOLEAN NOT NULL DEFAULT false,
  embed_domains TEXT[],
  embed_token TEXT,
  embed_settings JSONB DEFAULT '{"width": "100%", "height": "auto", "autoplay": false, "controls": true}',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Key Features:**
- **Multi-language Support**: Language field for internationalization
- **Embed System**: Token-based secure embedding with domain restrictions
- **Channel Organization**: Optional channel association
- **Status Tracking**: Upload and processing status management
- **Public/Private Control**: Granular visibility settings

### 📝 Transcript System

#### Transcripts Table
**Header table for transcript metadata**

```sql
CREATE TABLE public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL,
  language TEXT NOT NULL,
  created_by UUID NOT NULL,
  checksum TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### Transcript Segments Table
**Word-level caption data with advanced features**

```sql
CREATE TABLE public.transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID,
  video_id UUID NOT NULL,
  idx INTEGER,
  start_time NUMERIC NOT NULL,
  end_time NUMERIC NOT NULL,
  text TEXT NOT NULL,
  speaker TEXT DEFAULT 'Speaker',
  speaker_color TEXT DEFAULT '#3B82F6',
  emphasis TEXT DEFAULT 'normal',
  pitch TEXT DEFAULT 'normal',
  confidence NUMERIC DEFAULT 0.95,
  segment_type TEXT DEFAULT 'dialogue',
  is_off_camera BOOLEAN DEFAULT false,
  language TEXT NOT NULL DEFAULT 'en',
  words JSONB, -- Word-level timing data
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Advanced Features:**
- **Word-Level Timing**: JSONB storage for precise word synchronization
- **Speaker Identification**: Color-coded speakers with customizable colors
- **Emotional Context**: Emphasis and pitch markers for "Captions with Intention"
- **Confidence Scoring**: AI transcription confidence levels
- **Multi-language**: Per-segment language identification

### 🎨 Characters Table
**Speaker/character management with visual and voice properties**

```sql
CREATE TABLE public.characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  color TEXT NOT NULL,
  voice_id TEXT,
  voice_name TEXT,
  voice_type TEXT,
  emphasis TEXT DEFAULT 'normal',
  pitch TEXT DEFAULT 'normal',
  is_off_camera BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Character Features:**
- **Visual Identity**: Custom colors for caption styling
- **Voice Properties**: Voice cloning and synthesis settings
- **Behavioral Traits**: Emphasis and pitch characteristics
- **Visibility Control**: On-camera vs off-camera speakers

### 🔊 Audio Descriptions Table
**Creative audio descriptions for visual content**

```sql
CREATE TABLE public.audio_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL,
  start_time NUMERIC NOT NULL,
  end_time NUMERIC NOT NULL,
  description TEXT NOT NULL,
  description_type TEXT DEFAULT 'visual',
  language TEXT NOT NULL DEFAULT 'en',
  confidence NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Description Features:**
- **Time-synchronized**: Precise timing for non-intrusive narration
- **Creative Content**: Poetic, cinematic descriptions
- **Multi-language**: Translated descriptions
- **Type Classification**: Visual, emotional, contextual descriptions

## 📺 Channel & Organization

### 📋 Channels Table
**Content organization and branding**

```sql
CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  subscriber_count INTEGER NOT NULL DEFAULT 0,
  video_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 📧 Channel Subscriptions Table
**Subscription management with email and authenticated user support**

```sql
CREATE TABLE public.channel_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL,
  subscriber_user_id UUID, -- For authenticated users
  subscriber_email TEXT,   -- For email subscriptions
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 💳 Subscription & Billing

### 👥 Subscribers Table
**User subscription and payment data with enhanced security**

```sql
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  stripe_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT,
  subscription_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Security Features:**
- **No Direct Access**: All access through secure functions
- **Encrypted PII**: Sensitive data protection
- **Audit Logging**: All access tracked
- **Stripe Integration**: Secure payment processing

### 🔍 Subscriber Access Audit Table
**Security audit trail for subscription data access**

```sql
CREATE TABLE public.subscriber_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  accessed_subscriber_id UUID NOT NULL,
  access_type TEXT NOT NULL,
  accessed_fields TEXT[],
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 📊 Analytics & Tracking

### 📈 Public Video Views Table
**Privacy-compliant video analytics**

```sql
CREATE TABLE public.public_video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL,
  viewer_ip INET, -- Anonymized
  view_duration_seconds INTEGER,
  watched_percentage NUMERIC,
  accessibility_features_used JSONB DEFAULT '{}',
  user_agent TEXT, -- Anonymized
  referrer TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 📊 Embed Analytics Table
**Embedded player analytics**

```sql
CREATE TABLE public.embed_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL,
  ip_address INET, -- Anonymized
  view_count INTEGER DEFAULT 1,
  duration_watched NUMERIC DEFAULT 0,
  embed_token TEXT,
  referrer_domain TEXT,
  user_agent TEXT, -- Anonymized
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 🔧 Processing & Jobs

### ⚙️ Jobs Table
**Background task processing**

```sql
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL,
  type job_type NOT NULL,
  status job_status NOT NULL DEFAULT 'pending',
  payload JSONB,
  result JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Job Types:**
- `transcription`: Speech-to-text processing
- `analysis`: Video content analysis
- `generation`: AI content generation
- `translation`: Multi-language translation
- `synthesis`: Voice synthesis

## 🎭 Advanced Features

### 😊 Emotion Spans Table
**Emotional analysis data**

```sql
CREATE TABLE public.emotion_spans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL,
  start_time NUMERIC NOT NULL,
  end_time NUMERIC NOT NULL,
  emotion TEXT NOT NULL,
  intent TEXT,
  intensity INTEGER,
  confidence NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 🗣️ Speaker Mappings Table
**Speaker identification and mapping**

```sql
CREATE TABLE public.speaker_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  mappings JSONB NOT NULL DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 💾 Content Generation Cache Table
**AI generation result caching**

```sql
CREATE TABLE public.content_generation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL,
  content_type TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  generation_params JSONB,
  result_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 🎵 Media Tracks

### 🎶 Tracks Table
**Subtitle and audio track management**

```sql
CREATE TABLE public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL,
  kind track_kind NOT NULL, -- 'subtitles', 'captions', 'audio'
  url TEXT NOT NULL,
  language TEXT,
  label TEXT,
  format TEXT,
  is_default BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 🔐 Security Features

### Row-Level Security (RLS)
All tables implement comprehensive RLS policies:

```sql
-- Example: Users can only access their own videos
CREATE POLICY "Users can view their own videos" 
ON public.videos 
FOR SELECT 
USING (auth.uid() = user_id);

-- Example: Public videos are viewable by everyone
CREATE POLICY "Allow public viewing of public videos" 
ON public.videos 
FOR SELECT 
USING (is_public = true);
```

### Security Functions

#### Enhanced Subscription Security
```sql
-- Secure subscription data access
CREATE OR REPLACE FUNCTION public.get_secure_subscription_info()
RETURNS TABLE(is_active boolean, tier_name text, expires_at timestamptz, features_available jsonb)
LANGUAGE plpgsql SECURITY DEFINER;

-- Anonymization functions
CREATE OR REPLACE FUNCTION public.anonymize_ip_address(ip_addr inet)
RETURNS inet LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.anonymize_user_agent(user_agent_str text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER;
```

## 📈 Performance Optimizations

### Indexes
```sql
-- Video search optimization
CREATE INDEX idx_videos_user_public ON videos(user_id, is_public);
CREATE INDEX idx_videos_channel_public ON videos(channel_id, is_public) WHERE is_public = true;

-- Caption search optimization
CREATE INDEX idx_transcript_segments_video_lang ON transcript_segments(video_id, language);
CREATE INDEX idx_transcript_segments_timing ON transcript_segments(start_time, end_time);

-- Analytics optimization
CREATE INDEX idx_video_views_video_date ON public_video_views(video_id, created_at);
CREATE INDEX idx_embed_analytics_video_domain ON embed_analytics(video_id, referrer_domain);
```

### Triggers
```sql
-- Auto-update channel video counts
CREATE TRIGGER update_channel_video_count
AFTER INSERT OR UPDATE OR DELETE ON videos
FOR EACH ROW EXECUTE FUNCTION update_channel_video_count();

-- Auto-update subscriber counts
CREATE TRIGGER update_subscriber_count
AFTER INSERT OR DELETE ON channel_subscriptions
FOR EACH ROW EXECUTE FUNCTION update_subscriber_count();

-- Privacy protection triggers
CREATE TRIGGER anonymize_video_views_trigger
BEFORE INSERT ON public_video_views
FOR EACH ROW EXECUTE FUNCTION anonymize_video_views();
```

## 🌐 Multi-tenancy & Scaling

### Data Partitioning Strategy
- **User-based partitioning**: Large tables partitioned by user_id
- **Time-based partitioning**: Analytics tables partitioned by date
- **Geographic partitioning**: Future consideration for global scaling

### Backup & Recovery
- **Automated backups**: Daily full database backups
- **Point-in-time recovery**: Transaction log preservation
- **Geographic redundancy**: Cross-region backup storage
- **Data retention**: Configurable retention policies

This database schema provides the foundation for Axessible's accessibility-first video platform, ensuring data integrity, security, and performance at scale.
# Current System State Documentation

## Overview
Axessible is a video accessibility platform that allows users to upload videos and add accessibility features like captions, audio descriptions, and sign language interpretation.

## Current Architecture

### Database Schema (Supabase)

#### Core Tables
- **videos**: Main video table with metadata, status, embed settings
- **transcript_segments**: Word-level transcript data with timing and speaker info
- **transcripts**: Transcript headers with language and checksum
- **characters**: Character definitions with colors and voice settings
- **sign_language_clips**: ASL video clips linked to transcript segments
- **audio_descriptions**: Audio description cues with timing
- **tracks**: Video tracks (subtitles, audio, etc.)

#### User & Channel Management
- **profiles**: User profile information
- **channels**: User channels for organizing videos
- **channel_subscriptions**: Channel subscription system

#### Analytics & Security
- **embed_analytics**: Tracking for embedded video views
- **public_video_views**: Public video view analytics
- **security_audit_log**: Security event tracking
- **subscribers**: Subscription management (blocked by RLS)

### Storage Buckets
- **videos**: Public bucket for video files
- **thumbnails**: Public bucket for video thumbnails
- **tracks**: Private bucket for subtitle/track files
- **processed-videos**: Public bucket for processed video outputs
- **sign_language_clips**: Public bucket for ASL video clips

### Key Components

#### Video Processing
- **BrowserVideoProcessor**: FFmpeg.js-based video processing for subtitle burning
- **AxessiblePlayer**: Main video player with accessibility features
- **EnhancedVideoPlayer**: Database-integrated player with timing normalization
- **CleanAxessiblePlayer**: Simplified player version

#### Accessibility Features
- **CaptionsWithIntention**: Word-by-word synchronized captions with character colors
- **SynchronizedSignLanguagePlayer**: ASL video overlay synchronized with main video
- **AudioDescriptionEditor**: Interface for creating/editing audio descriptions
- **AccessibilityControls**: User controls for accessibility features

#### Transcript Management
- **TranscriptEditor**: Rich text editor for transcript content
- **TranscriptWorkflow**: Multi-step transcript creation workflow
- **WordLevelEditor**: Word-by-word timing editor
- **SpeakerIdentificationPanel**: Speaker detection and mapping

#### UI Components
- **VideoPlayerWithTranscript**: Integrated player and transcript view
- **CharacterManager**: Character creation and color assignment
- **ASLClipUploader**: Upload interface for sign language clips
- **ThumbnailGenerator**: Video thumbnail creation

### Current Features

#### Video Management
- Video upload with multiple format support
- Thumbnail generation and management
- Public/private video settings
- Embed functionality with domain restrictions
- Channel organization

#### Accessibility
- **Captions**: Word-level synchronized captions with character-specific colors
- **Audio Descriptions**: Timed audio descriptions for visual content
- **Sign Language**: ASL video clips synchronized with transcript segments
- **Keyboard Navigation**: Full keyboard accessibility support

#### Transcript Processing
- Automatic transcription via AssemblyAI
- Manual transcript editing with rich text features
- Word-level timing synthesis and normalization
- Speaker identification and color coding
- Multi-language support

#### Analytics & Security
- Video view tracking with privacy compliance
- Embed analytics for embedded videos
- Comprehensive security audit logging
- IP address and user agent anonymization

### Integration Points

#### External APIs
- **AssemblyAI**: Transcription services
- **ElevenLabs**: Text-to-speech for audio descriptions
- **OpenAI**: AI-powered content analysis
- **Stripe**: Subscription management
- **TwelveLabs**: Advanced video analysis

#### Authentication
- Supabase Auth integration
- Row-Level Security (RLS) policies
- User role management system

### Current Limitations
- No finalized video export functionality
- No combined accessibility feature rendering
- Manual process for creating final accessible videos
- Limited batch processing capabilities

## Next Implementation: Finalize & Export Flow
The next major feature will add the ability to:
1. Combine all accessibility features into a single rendered video
2. Export to private storage with download links
3. Manage export history and downloads
4. Provide quality validation and guardrails

---
*Document updated: 2024-01-24*
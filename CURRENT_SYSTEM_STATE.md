# Current System State Documentation

## Overview
Axessible is a video accessibility platform that allows users to upload videos and add accessibility features like captions, audio descriptions, and sign language interpretation. The system now includes a complete **Finalize & Export** workflow that renders accessible MP4 videos with any combination of accessibility features.

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
- **video_exports**: NEW - Tracks finalized video exports with options and status

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
- **exports**: NEW - Private bucket for finalized accessible video exports

### Key Components

#### Video Processing
- **BrowserVideoProcessor**: FFmpeg.js-based video processing for subtitle burning
- **VideoExportProcessor**: NEW - Enhanced FFmpeg processor for multi-layer accessible video rendering
- **ExportOrchestrator**: NEW - Manages complete export workflow from assets to download
- **AxessiblePlayer**: Main video player with accessibility features
- **EnhancedVideoPlayer**: Database-integrated player with timing normalization
- **CleanAxessiblePlayer**: Simplified player version

#### Accessibility Features
- **CaptionsWithIntention**: Word-by-word synchronized captions with character colors
- **SynchronizedSignLanguagePlayer**: ASL video overlay synchronized with main video
- **AudioDescriptionEditor**: Interface for creating/editing audio descriptions
- **AccessibilityControls**: User controls for accessibility features

#### NEW: Export System
- **ExportModal**: UI for selecting export options with real-time validation
- **VideoExportButton**: Trigger button integrated into video detail pages
- **VideoExportsPanel**: Management panel for viewing and downloading exports
- **Export Types**: Complete TypeScript type definitions for export workflow

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

#### NEW: Finalize & Export System
- **Multi-layer Rendering**: Combines captions, audio descriptions, and sign language PiP
- **Real-time Processing**: Browser-based FFmpeg processing with progress tracking
- **Private Storage**: Secure export storage with user-only access
- **Download Management**: Signed URL downloads with export history
- **Quality Validation**: Pre-export validation and mobile device warnings
- **Export Options**: Flexible selection of accessibility features to include

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

### Export Workflow Features

#### Technical Capabilities
- **FFmpeg.js Integration**: Browser-based video processing (no server required)
- **Multi-track Audio**: Program audio ducking with audio description overlay
- **Video Overlays**: Time-synced sign language picture-in-picture positioning
- **Subtitle Burning**: Character-colored captions burned into video
- **Progress Tracking**: Real-time processing feedback
- **Error Handling**: Graceful failure recovery with user notifications

#### User Experience
- **Feature Detection**: Automatic validation of available accessibility content
- **Mobile Warnings**: Performance guidance for mobile users
- **Export History**: Complete tracking of user's finalized videos
- **Secure Downloads**: Time-limited signed URLs for download access
- **Storage Management**: User can delete old exports to manage storage

### System Improvements
- Complete export functionality eliminates manual accessibility video creation
- Private storage ensures user content security
- Real-time processing provides immediate feedback
- Comprehensive validation prevents export failures
- Mobile-optimized experience with appropriate warnings

---
*Document updated: 2025-01-24 - Added complete Finalize & Export system*
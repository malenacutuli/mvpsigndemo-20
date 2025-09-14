# API Documentation

## 🚀 Edge Functions & API Reference

Axessible uses Supabase Edge Functions for serverless API endpoints, providing secure, scalable backend functionality with comprehensive AI integrations.

## 🔧 Core API Architecture

### Authentication
All protected endpoints require JWT authentication via Supabase Auth:

```typescript
// Client-side authentication
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { /* request data */ },
  headers: {
    Authorization: `Bearer ${session.access_token}`
  }
});
```

### CORS Configuration
All functions include comprehensive CORS support:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

## 🎥 Video Processing APIs

### 📝 Transcription Service
**Endpoint**: `/functions/v1/transcribe`  
**Auth**: Required  
**Description**: Convert video audio to text with speaker identification

#### Request Body:
```typescript
{
  videoUrl: string;
  language?: string; // Default: 'en'
  enableSpeakerDiarization?: boolean; // Default: true
  customVocabulary?: string[];
}
```

#### Response:
```typescript
{
  success: boolean;
  transcriptId: string;
  segments: {
    id: string;
    startTime: number;
    endTime: number;
    text: string;
    speaker: string;
    confidence: number;
    words: {
      text: string;
      startTime: number;
      endTime: number;
      confidence: number;
    }[];
  }[];
}
```

#### Implementation Features:
- **OpenAI Whisper**: Primary transcription engine
- **AssemblyAI**: Speaker diarization and advanced features
- **Confidence Scoring**: Quality metrics for each segment
- **Custom Vocabulary**: Support for specialized terminology

### 🎭 Enhanced Video Analysis
**Endpoint**: `/functions/v1/enhanced-video-analysis`  
**Auth**: Public (with rate limiting)  
**Description**: Comprehensive video content analysis using multiple AI services

#### Request Body:
```typescript
{
  videoUrl: string;
  analysisTypes: ('scenes' | 'objects' | 'text' | 'emotions' | 'activities')[];
  includeTimestamps: boolean;
  confidenceThreshold?: number; // Default: 0.7
}
```

#### Response:
```typescript
{
  success: boolean;
  analysis: {
    scenes: {
      startTime: number;
      endTime: number;
      description: string;
      confidence: number;
      objects: string[];
      activities: string[];
    }[];
    emotions: {
      startTime: number;
      endTime: number;
      emotion: string;
      intensity: number;
      confidence: number;
    }[];
    text_detections: {
      startTime: number;
      text: string;
      position: { x: number; y: number; width: number; height: number };
      confidence: number;
    }[];
  };
}
```

#### AI Services Integration:
- **Twelve Labs**: Advanced video understanding
- **HuggingFace**: Computer vision models
- **Google Vision**: OCR and object detection

### 🎨 Audio Description Generation
**Endpoint**: `/functions/v1/generate-ad`  
**Auth**: Required  
**Description**: Generate creative audio descriptions for visual content

#### Request Body:
```typescript
{
  videoSegments: {
    text: string;
    startTime: number;
    endTime: number;
  }[];
  contentType: 'recipe' | 'education' | 'entertainment' | 'documentary';
  style?: 'formal' | 'casual' | 'poetic'; // Default: 'poetic'
  language?: string; // Default: 'en'
}
```

#### Response:
```typescript
{
  success: boolean;
  descriptions: {
    text: string;
    startTime: number;
    endTime: number;
    voiceStyle: string;
  }[];
  metadata: {
    totalDescriptions: number;
    averageLength: number;
    estimatedDuration: number;
  };
}
```

#### Creative Features:
- **GPT-4 Integration**: Context-aware description generation
- **Style Adaptation**: Different narrative styles for different content
- **Timing Optimization**: Intelligent placement between dialogue
- **Cultural Sensitivity**: Appropriate descriptions for different audiences

## 🗣️ Voice & Audio APIs

### 🎤 Text-to-Speech Synthesis
**Endpoint**: `/functions/v1/tts`  
**Auth**: Required  
**Description**: Convert text to natural speech using advanced voice synthesis

#### Request Body:
```typescript
{
  text: string;
  voiceId?: string;
  language?: string; // Default: 'en'
  speed?: number; // 0.25 - 2.0, Default: 1.0
  pitch?: number; // 0.5 - 2.0, Default: 1.0
  emotion?: 'neutral' | 'happy' | 'sad' | 'excited' | 'calm';
}
```

#### Response:
```typescript
{
  success: boolean;
  audioUrl: string;
  duration: number;
  voiceId: string;
  metadata: {
    characters: number;
    estimatedCost: number;
  };
}
```

#### Voice Options:
- **ElevenLabs**: Premium voice synthesis
- **OpenAI**: High-quality text-to-speech
- **Custom Voices**: User-trained voice models

### 🎯 Voice Cloning
**Endpoint**: `/functions/v1/voice-cloning`  
**Auth**: Required  
**Description**: Create custom voice models from audio samples

#### Request Body:
```typescript
{
  audioSamples: string[]; // Base64 encoded audio files
  voiceName: string;
  description?: string;
  trainingText?: string; // Text matching the audio samples
}
```

#### Response:
```typescript
{
  success: boolean;
  voiceId: string;
  status: 'training' | 'ready' | 'failed';
  estimatedCompletion?: string;
  metadata: {
    sampleCount: number;
    totalDuration: number;
    quality: 'low' | 'medium' | 'high';
  };
}
```

### 🌍 Dubbing & Translation
**Endpoint**: `/functions/v1/generate-dubbing`  
**Auth**: Required  
**Description**: Translate and generate dubbed audio in target languages

#### Request Body:
```typescript
{
  text: string;
  targetLanguage: string;
  voiceId?: string;
  preserveEmphasis?: boolean; // Default: true
  syncToVideo?: boolean; // Default: false
}
```

#### Response:
```typescript
{
  success: boolean;
  originalText: string;
  translatedText: string;
  audioBase64: string;
  targetLanguage: string;
  metadata: {
    translationConfidence: number;
    audioDuration: number;
    lipSyncCompatible: boolean;
  };
}
```

## 📊 Analytics & Tracking APIs

### 📈 Embed Analytics
**Endpoint**: `/functions/v1/embed-analytics`  
**Auth**: Public  
**Description**: Track embedded video player analytics

#### Request Body:
```typescript
{
  videoId: string;
  event: 'play' | 'pause' | 'seek' | 'end' | 'progress';
  timestamp: number;
  duration?: number;
  position?: number;
  embedToken?: string;
  referrerDomain?: string;
  accessibilityFeatures?: {
    captionsEnabled: boolean;
    audioDescriptionsEnabled: boolean;
    playbackSpeed: number;
  };
}
```

#### Response:
```typescript
{
  success: boolean;
  tracked: boolean;
  sessionId: string;
}
```

#### Privacy Features:
- **IP Anonymization**: Automatic IP address masking
- **GDPR Compliance**: Privacy-first analytics
- **Opt-out Support**: Respect user privacy preferences
- **Data Minimization**: Collect only necessary metrics

## 💳 Subscription & Billing APIs

### 🏷️ Subscription Management
**Endpoint**: `/functions/v1/check-subscription`  
**Auth**: Required  
**Description**: Get current user subscription status and features

#### Response:
```typescript
{
  success: boolean;
  subscription: {
    isActive: boolean;
    tier: 'free' | 'starter' | 'standard' | 'premium';
    expiresAt?: string;
    features: {
      storageGB: number;
      videosPerMonth: number;
      aiFeatures: boolean;
      customBranding: boolean;
      apiAccess: boolean;
      prioritySupport: boolean;
    };
  };
  usage: {
    currentStorageGB: number;
    videosThisMonth: number;
    apiCallsThisMonth: number;
  };
}
```

### 💰 Stripe Integration
**Endpoint**: `/functions/v1/create-checkout`  
**Auth**: Required  
**Description**: Create Stripe checkout session for subscription

#### Request Body:
```typescript
{
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  allowPromotionCodes?: boolean;
}
```

#### Response:
```typescript
{
  success: boolean;
  checkoutUrl: string;
  sessionId: string;
}
```

### 🔄 Customer Portal
**Endpoint**: `/functions/v1/customer-portal`  
**Auth**: Required  
**Description**: Generate Stripe customer portal link

#### Response:
```typescript
{
  success: boolean;
  portalUrl: string;
}
```

## 🎬 Content Generation APIs

### 🖼️ Thumbnail Generation
**Endpoint**: `/functions/v1/generate-thumbnail`  
**Auth**: Required  
**Description**: Generate video thumbnails and poster frames

#### Request Body:
```typescript
{
  videoUrl: string;
  timestamps?: number[]; // Specific times to capture
  count?: number; // Number of thumbnails (default: 3)
  width?: number; // Default: 1280
  height?: number; // Default: 720
  format?: 'jpg' | 'png' | 'webp'; // Default: 'jpg'
}
```

#### Response:
```typescript
{
  success: boolean;
  thumbnails: {
    url: string;
    timestamp: number;
    width: number;
    height: number;
    format: string;
  }[];
}
```

### 💋 Lip Sync Generation
**Endpoint**: `/functions/v1/generate-lipsync`  
**Auth**: Public (rate limited)  
**Description**: Generate lip-synchronized video for dubbed content

#### Request Body:
```typescript
{
  videoUrl: string;
  audioUrl: string;
  targetLanguage?: string;
  qualityLevel?: 'fast' | 'balanced' | 'high'; // Default: 'balanced'
}
```

#### Response:
```typescript
{
  success: boolean;
  videoUrl: string;
  processingTime: number;
  qualityMetrics: {
    lipSyncAccuracy: number;
    audioQuality: number;
    videoQuality: number;
  };
}
```

## 🧠 AI Analysis APIs

### 🎭 Speaker Diarization
**Endpoint**: `/functions/v1/speaker-diarization`  
**Auth**: Required  
**Description**: Identify and separate different speakers in audio

#### Request Body:
```typescript
{
  audioUrl: string;
  speakerCount?: number; // Auto-detect if not provided
  language?: string;
  includeEmotions?: boolean;
}
```

#### Response:
```typescript
{
  success: boolean;
  speakers: {
    id: string;
    label: string;
    segments: {
      startTime: number;
      endTime: number;
      text: string;
      confidence: number;
      emotion?: string;
      intensity?: number;
    }[];
    characteristics: {
      gender?: 'male' | 'female' | 'unknown';
      ageRange?: string;
      accent?: string;
      speakingRate: number;
    };
  }[];
}
```

### 📊 Vocal Intensity Analysis
**Endpoint**: `/functions/v1/analyze-vocal-intensity`  
**Auth**: Required  
**Description**: Analyze vocal intensity and emotional characteristics

#### Request Body:
```typescript
{
  videoId: string;
  segments: {
    startTime: number;
    endTime: number;
    text: string;
    speaker?: string;
  }[];
  audioData?: string; // Base64 encoded audio
}
```

#### Response:
```typescript
{
  success: boolean;
  analysis: {
    segmentId: string;
    intensity: 'whisper' | 'normal' | 'loud' | 'yell' | 'shout';
    confidence: number;
    emotionalMarkers: {
      stress: number;
      excitement: number;
      calmness: number;
    };
    recommendedStyling: {
      fontSize: string;
      fontWeight: string;
      color: string;
      animation?: string;
    };
  }[];
}
```

## 🛡️ Security & Admin APIs

### 🔐 Security Scanning
**Endpoint**: `/functions/v1/security-scan`  
**Auth**: Admin Only  
**Description**: Perform security analysis of the platform

#### Response:
```typescript
{
  success: boolean;
  scanResults: {
    critical: SecurityIssue[];
    high: SecurityIssue[];
    medium: SecurityIssue[];
    low: SecurityIssue[];
  };
  overallScore: number;
  recommendations: string[];
}

interface SecurityIssue {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  remediation: string;
  affectedComponents: string[];
}
```

## 🔄 Webhook Endpoints

### 💳 Stripe Webhooks
**Endpoint**: `/functions/v1/stripe-webhook`  
**Auth**: Webhook signature verification  
**Description**: Handle Stripe payment events

#### Supported Events:
- `customer.subscription.created`
- `customer.subscription.updated` 
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### 📊 Analytics Webhooks
**Endpoint**: `/functions/v1/analytics-webhook`  
**Auth**: API Key  
**Description**: Receive analytics data from external sources

## 💡 Usage Examples

### Complete Video Processing Workflow

```typescript
// 1. Upload video and get transcription
const transcription = await supabase.functions.invoke('transcribe', {
  body: { videoUrl: 'https://example.com/video.mp4' }
});

// 2. Analyze video content
const analysis = await supabase.functions.invoke('enhanced-video-analysis', {
  body: { 
    videoUrl: 'https://example.com/video.mp4',
    analysisTypes: ['scenes', 'emotions', 'objects']
  }
});

// 3. Generate audio descriptions
const descriptions = await supabase.functions.invoke('generate-ad', {
  body: {
    videoSegments: transcription.data.segments,
    contentType: 'education'
  }
});

// 4. Create voice synthesis
const audioDescriptions = await supabase.functions.invoke('tts', {
  body: {
    text: descriptions.data.descriptions.map(d => d.text).join(' '),
    voiceId: 'narrator-voice'
  }
});

// 5. Generate thumbnails
const thumbnails = await supabase.functions.invoke('generate-thumbnail', {
  body: { videoUrl: 'https://example.com/video.mp4' }
});
```

## 🚦 Rate Limits & Quotas

### API Rate Limits:
- **Free Tier**: 100 requests/hour
- **Starter**: 1,000 requests/hour  
- **Standard**: 10,000 requests/hour
- **Premium**: 100,000 requests/hour

### Processing Quotas:
- **Transcription**: Based on minutes processed
- **Voice Synthesis**: Based on characters converted
- **Video Analysis**: Based on video duration
- **Storage**: Based on subscription tier

## 🔍 Error Handling

### Standard Error Response:
```typescript
{
  success: false,
  error: {
    code: string;
    message: string;
    details?: any;
  };
  requestId: string;
}
```

### Common Error Codes:
- `AUTH_REQUIRED`: Authentication needed
- `INSUFFICIENT_QUOTA`: Usage limit exceeded
- `INVALID_INPUT`: Request validation failed
- `PROCESSING_ERROR`: AI service error
- `RATE_LIMITED`: Too many requests

This comprehensive API suite enables developers to build accessibility-first video applications with enterprise-grade features and AI-powered content enhancement.
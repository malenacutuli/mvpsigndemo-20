# Architecture Documentation

## 🏗️ System Architecture Overview

Axessible is built as a modern, scalable web application with a focus on accessibility, performance, and maintainability. The architecture follows a serverless approach with a React frontend and Supabase backend.

## 📊 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│  • React 18 + TypeScript                                   │
│  • Vite Build System                                       │
│  • Tailwind CSS + shadcn/ui                               │
│  • React Router + React Query                             │
│  • i18next Internationalization                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Supabase Backend                         │
├─────────────────────────────────────────────────────────────┤
│  • PostgreSQL Database with RLS                           │
│  • Authentication & Authorization                         │
│  • Edge Functions (Serverless APIs)                       │
│  • Storage (Videos, Images, Audio)                        │
│  • Real-time Subscriptions                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                External Integrations                       │
├─────────────────────────────────────────────────────────────┤
│  • OpenAI (GPT-4, Whisper)     • Twelve Labs             │
│  • ElevenLabs (Voice Synthesis) • HuggingFace            │
│  • AssemblyAI (Transcription)   • Stripe (Payments)      │
│  • FFmpeg (Video Processing)    • Firebase (Analytics)    │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Core Components

### Frontend Architecture

#### Component Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui base components
│   ├── AxessiblePlayer.tsx    # Main video player
│   ├── CaptionsWithIntention.tsx  # Caption system
│   ├── AudioDescription.tsx       # Audio descriptions
│   ├── AccessibilityControls.tsx  # A11y controls
│   └── ...
├── pages/              # Route components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── integrations/       # External service integrations
└── i18n/              # Internationalization
```

#### Key Design Patterns

1. **Compound Components**: Complex components like `AxessiblePlayer` use compound patterns for flexibility
2. **Custom Hooks**: Business logic abstracted into reusable hooks
3. **Provider Pattern**: Context providers for auth, subscription, and global state
4. **Render Props**: For components requiring flexible rendering logic

### Backend Architecture

#### Database Layer
- **PostgreSQL** with Row-Level Security (RLS)
- **Prisma-like** schema with strong typing via Supabase
- **Audit Logging** for security and compliance
- **Data Encryption** for sensitive information

#### API Layer
- **Edge Functions** for serverless compute
- **Real-time APIs** via Supabase channels
- **RESTful** endpoints with GraphQL-like flexibility
- **Type-safe** client-server communication

#### Storage Layer
- **Supabase Storage** for video, image, and audio files
- **CDN Integration** for global content delivery
- **Bucket Policies** for fine-grained access control
- **Automatic Optimization** for web delivery

## 🔐 Security Architecture

### Authentication & Authorization

```typescript
// RLS Policy Example
CREATE POLICY "Users can view their own videos" 
ON public.videos 
FOR SELECT 
USING (auth.uid() = user_id);
```

#### Security Features
- **JWT-based Authentication** via Supabase Auth
- **Row-Level Security** on all database tables
- **Role-based Access Control** (RBAC)
- **API Key Management** via encrypted environment variables
- **Rate Limiting** on Edge Functions
- **CORS Protection** with specific domain allowlists

### Data Protection
- **PII Encryption** for subscriber data
- **Audit Logging** for all data access
- **Anonymized Analytics** with IP masking
- **GDPR Compliance** with data retention policies

## 🎥 Video Processing Pipeline

### Upload & Processing Flow

```
User Upload → Supabase Storage → Background Jobs → AI Processing → Database Storage
     │              │                    │              │              │
     ▼              ▼                    ▼              ▼              ▼
  Frontend       File Validation    Transcription   Analysis      Metadata
   Upload           & Storage        Generation     Results        Storage
```

#### Processing Steps
1. **File Upload**: Direct to Supabase Storage with resumable uploads
2. **Validation**: File type, size, and format checking
3. **Transcription**: Speech-to-text via OpenAI Whisper
4. **Speaker Diarization**: Speaker identification via AssemblyAI
5. **Visual Analysis**: Scene understanding via Twelve Labs
6. **Audio Description**: AI-generated descriptions via GPT-4
7. **Accessibility Grading**: Compliance checking and scoring

### Job Processing System

```typescript
interface Job {
  id: string;
  video_id: string;
  type: 'transcription' | 'analysis' | 'generation';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payload: Record<string, any>;
  result: Record<string, any>;
}
```

## 🌐 Internationalization Architecture

### i18n Structure
```
src/i18n/
├── config.ts                 # i18next configuration
└── locales/
    ├── en/common.json        # English translations
    ├── es/common.json        # Spanish translations
    ├── fr/common.json        # French translations
    └── ...
```

#### Features
- **Namespace-based** organization
- **Lazy Loading** of translation files
- **Browser Detection** for automatic language selection
- **RTL Support** for Arabic and Hebrew (planned)
- **Context-aware** pluralization rules

## 📊 State Management

### Client State Architecture

```typescript
// React Query for Server State
const { data: videos } = useQuery({
  queryKey: ['videos', userId],
  queryFn: () => fetchUserVideos(userId)
});

// Context for Global State
const { user, session } = useAuth();
const { subscribed, tier } = useSubscription();

// Local State for UI
const [isPlaying, setIsPlaying] = useState(false);
```

#### State Management Strategy
- **React Query**: Server state, caching, and synchronization
- **Context API**: Global application state (auth, subscription)
- **Local State**: Component-specific UI state
- **URL State**: Route parameters and search filters

## 🔄 Data Flow Patterns

### Caption Rendering Pipeline

```
Database → Word Timing → Character Colors → Rendering → Display
    │           │              │              │           │
    ▼           ▼              ▼              ▼           ▼
 Transcript   Synthesis    Color Mapping   React Comp   DOM
 Segments     Algorithm    Application     Rendering    Update
```

### Audio Description Flow

```
Video Analysis → Scene Detection → GPT-4 Generation → Voice Synthesis → Audio Track
      │                │                 │                  │              │
      ▼                ▼                 ▼                  ▼              ▼
  Twelve Labs     Key Moments        Creative         ElevenLabs      Final Audio
   Analysis       Identification      Descriptions     Synthesis       Integration
```

## 🚀 Performance Optimizations

### Frontend Optimizations
- **Code Splitting**: Route-based and component-based splitting
- **Lazy Loading**: Components and translation files
- **Image Optimization**: WebP format with fallbacks
- **Bundle Analysis**: Webpack Bundle Analyzer integration
- **Caching Strategy**: Service Worker for static assets

### Backend Optimizations
- **Connection Pooling**: Supabase connection optimization
- **Query Optimization**: Indexed database queries
- **Edge Caching**: CDN caching for static content
- **Background Processing**: Async job processing
- **Rate Limiting**: API endpoint protection

### Video Optimizations
- **Adaptive Streaming**: HLS/DASH for different bitrates
- **Preloading Strategy**: Intelligent content preloading
- **Thumbnail Generation**: Automated poster frame creation
- **Compression**: Optimized encoding settings

## 🏗️ Deployment Architecture

### Infrastructure
```
GitHub → Lovable CI/CD → Supabase Edge Functions → Global CDN
   │            │                    │                    │
   ▼            ▼                    ▼                    ▼
Source        Build &              Serverless           Content
Control       Deploy               Compute              Delivery
```

### Environment Management
- **Development**: Local development with Supabase CLI
- **Staging**: Preview deployments for testing
- **Production**: Global deployment with monitoring
- **Edge Functions**: Deployed automatically with code changes

## 📈 Scalability Considerations

### Horizontal Scaling
- **Serverless Functions**: Auto-scaling compute
- **Database Connections**: Connection pooling
- **Storage Scaling**: Automatic storage expansion
- **CDN Scaling**: Global content distribution

### Performance Monitoring
- **Real-time Metrics**: Supabase analytics
- **Error Tracking**: Custom error handling
- **Performance Budgets**: Core Web Vitals monitoring
- **User Analytics**: Privacy-compliant usage tracking

## 🔧 Development Tools

### Code Quality
- **TypeScript**: Strong typing throughout
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks
- **Testing**: Vitest for unit testing

### Development Experience
- **Hot Reload**: Instant development feedback
- **Type Safety**: End-to-end type safety
- **Auto-completion**: IDE support with IntelliSense
- **Error Boundaries**: Graceful error handling

This architecture ensures Axessible remains performant, secure, and maintainable while providing the accessibility features that make it unique in the market.
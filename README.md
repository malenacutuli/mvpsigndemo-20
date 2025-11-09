# Axessible - Universal Video Accessibility Platform

![Axessible Logo](/lovable-uploads/69bee058-9d55-465d-bec0-0156468ba560.png)

## 🌟 Overview

Axessible is a revolutionary video platform that makes every story truly accessible to everyone. We're the world's first platform designed with accessibility as the foundation, not an afterthought, featuring "Captions with Intention," creative audio descriptions, and immersive accessibility tools.

### 🎯 Mission
**"Where Every Story is Truly Seen, Heard, and Felt"**

We believe access isn't a feature—it's the future of storytelling. Our platform ensures that videos aren't just shared but truly experienced by everyone, regardless of their abilities.

## ✨ Key Features

### 🎬 Core Video Features
- **Captions with Intention**: Dynamic, expressive captions that move, pause, and flow with emotion
- **Creative Audio Descriptions**: Cinematic narration that paints the scene poetically
- **ASL Support**: Professional sign language interpretation integration
- **Universal Player**: Fully accessible video player with comprehensive controls
- **Multi-language Support**: Built-in internationalization (7+ languages)

### 🔧 Creator Tools
- **AI-Powered Transcription**: Automatic speech-to-text with speaker identification
- **Visual Analysis**: AI-generated scene descriptions and content analysis
- **Voice Cloning**: Custom voice synthesis for audio descriptions
- **Synchronized Dubbing**: Multi-language audio track generation
- **Accessibility Grading**: Automatic compliance checking (WCAG, ADA, EAA)

### 🏢 Enterprise Features
- **Channel Management**: Organize content with public/private channels
- **Analytics Dashboard**: Comprehensive viewing and engagement metrics
- **Subscription Management**: Flexible pricing tiers with Stripe integration
- **Embed Player**: Secure, customizable embeddable video player
- **Storage Management**: Efficient video storage with usage tracking

### 🛡️ Security & Privacy
- **Enhanced Security**: Row-level security with audit logging
- **Data Protection**: Privacy-compliant analytics and data handling
- **Secure Authentication**: Supabase Auth with role-based access
- **Payment Security**: PCI-compliant Stripe integration

## 🏗️ Technical Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** with semantic design tokens
- **shadcn/ui** component library
- **React Router** for navigation
- **React Query** for state management
- **i18next** for internationalization

### Backend Stack
- **Supabase** for database, auth, and storage
- **Edge Functions** for serverless API endpoints
- **PostgreSQL** with Row-Level Security (RLS)
- **Stripe** for payment processing
- **Multiple AI Integrations**: OpenAI, HuggingFace, ElevenLabs, Twelve Labs

### Key Integrations
- **OpenAI**: GPT-4 for transcription, descriptions, and analysis
- **AssemblyAI**: Advanced speech-to-text with speaker diarization
- **ElevenLabs**: High-quality voice synthesis
- **HuggingFace**: Video analysis and processing
- **Twelve Labs**: Advanced video understanding
- **FFmpeg**: Video processing and manipulation

## 📊 Database Schema

### Core Tables
- **videos**: Video metadata, settings, and status
- **transcript_segments**: Word-level caption data with timing
- **audio_descriptions**: Visual scene descriptions
- **characters**: Speaker/character information with colors and voices
- **channels**: Content organization and branding
- **subscribers**: User subscription and billing data

### Supporting Tables
- **jobs**: Background task processing
- **tracks**: Video subtitle/caption tracks
- **emotion_spans**: Emotional analysis data
- **content_generation_cache**: AI generation result caching
- **analytics tables**: View tracking and engagement metrics

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Various API keys (OpenAI, ElevenLabs, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd <YOUR_PROJECT_NAME>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Configure Supabase project ID and keys in src/integrations/supabase/client.ts
   # Add required API keys via Supabase Edge Function secrets
   ```

4. **Database Setup**
   ```bash
   # Database migrations are automatically applied
   # See supabase/migrations/ for schema changes
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## 📖 Documentation

- [**ARCHITECTURE.md**](./ARCHITECTURE.md) - Detailed technical architecture
- [**DATABASE.md**](./DATABASE.md) - Complete database schema and relationships
- [**FEATURES.md**](./FEATURES.md) - Comprehensive feature documentation
- [**API.md**](./API.md) - Edge Functions and API reference
- [**DEPLOYMENT.md**](./DEPLOYMENT.md) - Deployment and configuration guide
- [**CAPTIONS_WITH_INTENTION_REFERENCE.md**](./CAPTIONS_WITH_INTENTION_REFERENCE.md) - Core caption system documentation

## 🌍 Internationalization

Supports 7+ languages with complete localization:
- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)
- Catalan (ca)

## 💳 Subscription Tiers

### Free Tier
- 1GB storage
- Basic accessibility features
- Community support

### Starter (€26/month)
- 100GB storage
- 5 minutes video processing included
- Full accessibility suite (CWI, AD, Sign Language)
- 30-day free trial
- Additional minutes: €11.90/minute

### Standard (€65/month)
- 2TB storage
- 15 minutes video processing included
- Expert team support for up to 5 videos/month
- Accessible video download
- Additional minutes: €8.99/minute

### Advanced (€250/month)
- 5TB storage
- 80 minutes video processing included
- Multi-language dubbing (15+ languages)
- WCAG/ADA compliance reporting
- Expert-led accessibility audit
- Additional minutes: €5.99/minute

### Enterprise (Custom)
- Custom storage limits
- Unlimited video processing
- SSO & governance
- Dedicated account manager
- Custom integrations
- Priority support

## 🤝 Contributing

We collaborate with deaf, blind, and disabled creators, educators, and advocates to design every feature. Accessibility expertise is highly valued in our development process.

### Development Guidelines
- Follow semantic design tokens (no direct color usage)
- Maintain WCAG 2.1 AA compliance
- Test with screen readers and accessibility tools
- Document accessibility features thoroughly

## 📄 License

This project is proprietary software. All rights reserved.

## 🌐 Links

- **Live Platform**: [axessible.com](https://axessible.com)
- **Documentation**: [docs.axessible.com](https://docs.axessible.com)
- **Support**: [support@axessible.com](mailto:support@axessible.com)

## 🎯 Roadmap

### Current Version (v1.0)
- ✅ Core video player with accessibility features
- ✅ Captions with Intention system
- ✅ Audio descriptions generation
- ✅ Multi-language support
- ✅ Channel management
- ✅ Subscription system

### Upcoming Features
- 🔄 Advanced ASL avatar integration
- 🔄 Real-time collaboration tools
- 🔄 Mobile app development
- 🔄 Advanced analytics dashboard
- 🔄 API for third-party integrations

---

**"Access isn't optional. It's storytelling reimagined."**

*Join the platform where every story belongs.*
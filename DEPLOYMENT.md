# Deployment Guide

## 🚀 Deployment Overview

Axessible is built for modern deployment with Lovable's integrated CI/CD, Supabase backend services, and comprehensive production configurations. This guide covers all deployment scenarios from development to enterprise production.

## 🌟 Quick Deployment (Recommended)

### Lovable Platform Deployment
The fastest way to deploy Axessible is through the Lovable platform:

1. **Open Lovable Project**
   ```
   https://lovable.dev/projects/60f5b9ac-592f-4e50-926d-8ee8852d3cdf
   ```

2. **Click "Publish"** in the top-right corner
   - Automatic build and deployment
   - SSL certificates included
   - Global CDN distribution
   - Monitoring and analytics

3. **Configure Custom Domain** (Optional)
   - Navigate to Project → Settings → Domains
   - Connect your custom domain
   - Automatic SSL certificate provisioning

## 🏗️ Manual Deployment Options

### Prerequisites
- Node.js 18+ and npm
- Supabase project setup
- Required API keys configured
- Git repository access

### Environment Configuration

#### 1. Supabase Configuration
```typescript
// src/integrations/supabase/client.ts
const supabaseUrl = "https://faeyekynudyzeotbjfsj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

#### 2. Required Secrets (via Supabase Dashboard)
Configure these secrets in Supabase → Settings → Edge Functions:

```bash
# AI Services
OPENAI_API_KEY=sk-...
HUGGING_FACE_ACCESS_TOKEN=hf_...
ELEVENLABS_API_KEY=...
ASSEMBLYAI_API_KEY=...
TWELVE_LABS_API_KEY=...

# Payment Processing
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database & Auth
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Additional Services
RENDI_API_KEY=...
```

### Build Configuration

#### Production Build
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Preview production build (optional)
npm run preview
```

#### Build Optimization
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2015',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-tabs'],
          supabase: ['@supabase/supabase-js'],
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js']
  }
});
```

## 🌐 Deployment Platforms

### 1. Vercel Deployment

#### Setup:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Configuration (vercel.json):
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 2. Netlify Deployment

#### Setup:
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

#### Configuration (_redirects):
```
/*    /index.html   200
/api/*  /.netlify/functions/:splat  200
```

#### Configuration (netlify.toml):
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### 3. AWS Amplify Deployment

#### Setup:
```bash
# Install Amplify CLI
npm i -g @aws-amplify/cli

# Initialize Amplify
amplify init

# Deploy
amplify publish
```

#### Configuration (amplify.yml):
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### 4. Docker Deployment

#### Dockerfile:
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### nginx.conf:
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;
        
        # Gzip compression
        gzip on;
        gzip_types text/css application/javascript application/json image/svg+xml;
        gzip_comp_level 9;
        
        # Security headers
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        
        # Static assets caching
        location /assets/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # SPA routing
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
```

#### Docker Commands:
```bash
# Build image
docker build -t axessible .

# Run container
docker run -p 80:80 axessible
```

## 🗄️ Database Deployment

### Supabase Database Setup

#### 1. Create Supabase Project
```bash
# Install Supabase CLI
npm i -g supabase

# Initialize project
supabase init

# Link to existing project
supabase link --project-ref faeyekynudyzeotbjfsj
```

#### 2. Database Migrations
```bash
# Apply migrations
supabase db push

# Generate types
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

#### 3. Edge Functions Deployment
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy transcribe

# Set secrets
supabase secrets set OPENAI_API_KEY=sk-...
```

### Production Database Configuration

#### Connection Pooling:
```sql
-- Configure connection pooling for high traffic
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
```

#### Performance Optimization:
```sql
-- Add performance indexes
CREATE INDEX CONCURRENTLY idx_videos_user_status ON videos(user_id, status);
CREATE INDEX CONCURRENTLY idx_transcript_segments_video_timing ON transcript_segments(video_id, start_time, end_time);
CREATE INDEX CONCURRENTLY idx_analytics_video_date ON public_video_views(video_id, created_at);
```

## 🔧 Configuration Management

### Environment-Specific Configurations

#### Development:
```typescript
// src/config/development.ts
export const config = {
  supabase: {
    url: 'http://localhost:54321',
    anonKey: 'local-anon-key'
  },
  features: {
    debugMode: true,
    mockAI: true,
    logLevel: 'debug'
  }
};
```

#### Production:
```typescript
// src/config/production.ts
export const config = {
  supabase: {
    url: 'https://faeyekynudyzeotbjfsj.supabase.co',
    anonKey: 'production-anon-key'
  },
  features: {
    debugMode: false,
    mockAI: false,
    logLevel: 'error'
  }
};
```

### Feature Flags
```typescript
// src/lib/featureFlags.ts
export const featureFlags = {
  VOICE_CLONING: process.env.NODE_ENV === 'production',
  ADVANCED_ANALYTICS: true,
  BETA_FEATURES: false,
  REAL_TIME_CAPTIONS: true
};
```

## 📊 Monitoring & Analytics

### Production Monitoring Setup

#### 1. Error Tracking
```typescript
// src/lib/errorTracking.ts
import { supabase } from '@/integrations/supabase/client';

export const trackError = async (error: Error, context: any) => {
  if (process.env.NODE_ENV === 'production') {
    await supabase.from('error_logs').insert({
      message: error.message,
      stack: error.stack,
      context: JSON.stringify(context),
      user_agent: navigator.userAgent,
      url: window.location.href
    });
  }
};
```

#### 2. Performance Monitoring
```typescript
// src/lib/performance.ts
export const trackPerformance = () => {
  if ('performance' in window) {
    const navigation = performance.getEntriesByType('navigation')[0];
    const metrics = {
      loadTime: navigation.loadEventEnd - navigation.fetchStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime
    };
    
    // Send to analytics
    console.log('Performance metrics:', metrics);
  }
};
```

#### 3. Custom Analytics
```typescript
// src/lib/analytics.ts
export const analytics = {
  track: (event: string, properties: Record<string, any>) => {
    if (process.env.NODE_ENV === 'production') {
      supabase.functions.invoke('track-event', {
        body: { event, properties, timestamp: Date.now() }
      });
    }
  }
};
```

## 🔒 Security Configuration

### Production Security Headers
```typescript
// Add to deployment configuration
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co;
    media-src 'self' https:;
    font-src 'self' data:;
  `.replace(/\s+/g, ' ').trim()
};
```

### API Security
```typescript
// Edge function security middleware
export const withSecurity = (handler: Function) => {
  return async (req: Request) => {
    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    // Implement rate limiting logic
    
    // CORS handling
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }
    
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    return handler(req);
  };
};
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build application
      run: npm run build
    
    - name: Deploy to Supabase
      run: |
        supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
      env:
        SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
    
    - name: Deploy to production
      run: # Your deployment command
```

## 🧪 Testing in Production

### Health Check Endpoints
```typescript
// src/lib/healthCheck.ts
export const healthCheck = {
  database: async () => {
    const { data, error } = await supabase.from('videos').select('count');
    return !error;
  },
  
  aiServices: async () => {
    const { data, error } = await supabase.functions.invoke('health-check');
    return data?.healthy;
  },
  
  storage: async () => {
    const { data, error } = await supabase.storage.from('videos').list();
    return !error;
  }
};
```

### Smoke Tests
```typescript
// tests/smoke.test.ts
describe('Production Smoke Tests', () => {
  test('Application loads', async () => {
    const response = await fetch(process.env.PRODUCTION_URL);
    expect(response.status).toBe(200);
  });
  
  test('API endpoints respond', async () => {
    const response = await fetch(`${process.env.PRODUCTION_URL}/api/health`);
    expect(response.status).toBe(200);
  });
});
```

This deployment guide ensures Axessible can be reliably deployed across different platforms while maintaining security, performance, and accessibility standards.
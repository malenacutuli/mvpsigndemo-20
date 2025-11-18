import * as Sentry from "@sentry/react";

// IMPORTANT: Sentry DSN is a PUBLIC key - safe to hardcode
// Get your DSN from: https://sentry.io/settings/[your-org]/projects/[your-project]/keys/
const SENTRY_DSN = ""; // Add your Sentry DSN here

export function initMonitoring() {
  if (!SENTRY_DSN) {
    console.warn('⚠️ Sentry DSN not configured');
    return;
  }

  // Only initialize in production
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    Sentry.init({
      dsn: SENTRY_DSN,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration()
      ],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      environment: window.location.hostname.includes('lovable.app') ? 'production' : 'development',
    });

    console.log('✅ Sentry monitoring initialized');
  }
}

// Track custom events
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  // Add your analytics service here (PostHog, Mixpanel, etc.)
  console.log('📊 Event:', eventName, properties);
  
  // Optional: Send to Sentry as breadcrumb
  Sentry.addBreadcrumb({
    category: 'analytics',
    message: eventName,
    data: properties,
    level: 'info'
  });
}

// Track errors
export function logError(error: Error, context?: Record<string, any>) {
  // Check if we're in production (not localhost)
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    Sentry.captureException(error, { extra: context });
  } else {
    console.error('❌ Error:', error, context);
  }
}

// Track Premium Editor specific events
export function trackEditorEvent(action: string, metadata?: Record<string, any>) {
  trackEvent('premium_editor', {
    action,
    ...metadata,
    timestamp: new Date().toISOString()
  });
}

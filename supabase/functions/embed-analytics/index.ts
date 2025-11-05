import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiter (for production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per IP

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    // New window or expired
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count };
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime + 60000) { // 1 minute grace period
      rateLimitMap.delete(ip);
    }
  }
}, 300000);

interface AnalyticsPayload {
  video_id: string;
  embed_token?: string;
  event_type: 'view' | 'play' | 'pause' | 'complete' | 'seek';
  duration_watched?: number;
  video_position?: number;
  referrer_domain?: string;
  user_agent?: string;
  screen_resolution?: string;
  device_type?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get client IP for rate limiting
    const client_ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                      req.headers.get('x-real-ip') || 
                      'unknown';

    // Apply rate limiting
    const rateCheck = checkRateLimit(client_ip);
    if (!rateCheck.allowed) {
      console.warn('⚠️ Rate limit exceeded for IP:', client_ip);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: 60 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': '60',
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
            'X-RateLimit-Remaining': '0'
          } 
        }
      );
    }

    const payload: AnalyticsPayload = await req.json();
    const { 
      video_id, 
      embed_token, 
      event_type, 
      duration_watched, 
      video_position,
      referrer_domain, 
      user_agent,
      screen_resolution,
      device_type 
    } = payload;

    console.log('📊 Processing embed analytics:', { 
      video_id, 
      event_type, 
      referrer_domain, 
      rateLimit: { remaining: rateCheck.remaining } 
    });

    // Validate required fields
    if (!video_id || !event_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: video_id, event_type' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get client IP
    const ip_address = req.headers.get('x-forwarded-for') || 
                      req.headers.get('x-real-ip') || 
                      'unknown';

    // Extract domain from referrer
    let extracted_domain = 'direct';
    if (referrer_domain) {
      try {
        extracted_domain = new URL(referrer_domain).hostname;
      } catch {
        extracted_domain = referrer_domain;
      }
    }

    // 🔒 SECURITY: Validate embed access using hardened function
    const embedValidationResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/validate_embed_access`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        video_uuid: video_id,
        token: embed_token,
        referrer_domain: extracted_domain
      })
    });

    if (!embedValidationResponse.ok) {
      console.error('❌ Embed validation request failed:', embedValidationResponse.status);
      return new Response(
        JSON.stringify({ error: 'Embed validation failed' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const isValidEmbed = await embedValidationResponse.json();
    
    if (!isValidEmbed) {
      console.error('❌ Unauthorized embed access for video:', video_id);
      return new Response(
        JSON.stringify({ error: 'Unauthorized embed access' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Embed access validated for video:', video_id);

    // Create Supabase client for service role operations
    const response = await fetch(`${SUPABASE_URL}/rest/v1/embed_analytics`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY!,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        video_id,
        embed_token,
        event_type,
        duration_watched: duration_watched || 0,
        video_position: video_position || 0,
        referrer_domain: extracted_domain,
        user_agent: user_agent || req.headers.get('user-agent') || 'unknown',
        ip_address,
        screen_resolution,
        device_type,
        metadata: {
          timestamp: new Date().toISOString(),
          event_type,
          client_info: {
            screen_resolution,
            device_type,
            user_agent: user_agent || req.headers.get('user-agent')
          }
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Failed to insert analytics:', errorData);
      
      return new Response(
        JSON.stringify({ error: 'Failed to record analytics' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Analytics recorded successfully');

    // Return success response with rate limit headers
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Analytics recorded',
        event_type,
        video_id 
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
          'X-RateLimit-Remaining': String(rateCheck.remaining)
        } 
      }
    );

  } catch (error) {
    console.error('❌ Error in embed-analytics function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
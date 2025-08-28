import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log('📊 Processing embed analytics:', { video_id, event_type, referrer_domain });

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

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Analytics recorded',
        event_type,
        video_id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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
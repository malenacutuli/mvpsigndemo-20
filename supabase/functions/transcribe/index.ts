import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

serve(async (req) => {
  console.log("=== TRANSCRIBE FUNCTION STARTED ===");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight");
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.log("Invalid method:", req.method);
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    console.log("🔍 Step 1: Checking environment variables...");
    
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log("Environment check:", {
      hasOpenAI: !!OPENAI_API_KEY,
      hasAssemblyAI: !!ASSEMBLYAI_API_KEY,
      hasSupabaseUrl: !!SUPABASE_URL,
      hasSupabaseKey: !!SUPABASE_SERVICE_ROLE_KEY,
    });

    if (!ASSEMBLYAI_API_KEY) {
      console.error("❌ ASSEMBLYAI_API_KEY missing");
      return new Response(JSON.stringify({ 
        error: "ASSEMBLYAI_API_KEY not configured",
        details: "Please add your AssemblyAI API key to the secrets"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🔍 Step 2: Parsing request body...");
    const body = await req.text();
    console.log("Body length:", body.length);
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
      console.log("✅ Body parsed successfully");
    } catch (parseError) {
      console.error("❌ JSON parse error:", parseError);
      return new Response(JSON.stringify({ 
        error: "Invalid JSON in request body",
        details: parseError.message
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { videoUrl, videoId, language } = parsedBody;
    
    console.log("Request parameters:", {
      hasVideoUrl: !!videoUrl,
      videoId: videoId || 'none',
      language: language || 'auto'
    });

    if (!videoUrl) {
      console.error("❌ No videoUrl provided");
      return new Response(JSON.stringify({ 
        error: "videoUrl is required" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🔍 Step 3: Testing AssemblyAI connection...");
    
    // Simple test - just try to hit AssemblyAI API to verify credentials work
    try {
      const testResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
        method: "GET", 
        headers: {
          "Authorization": ASSEMBLYAI_API_KEY,
        }
      });
      
      console.log("AssemblyAI API test response:", testResponse.status);
      
      if (testResponse.status === 401) {
        return new Response(JSON.stringify({ 
          error: "Invalid AssemblyAI API key",
          details: "The AssemblyAI API key is not valid or has expired"
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (testError) {
      console.error("❌ AssemblyAI connection test failed:", testError);
      return new Response(JSON.stringify({ 
        error: "Failed to connect to AssemblyAI",
        details: testError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ AssemblyAI connection test passed");

    console.log("🔍 Step 4: Testing video accessibility...");
    
    try {
      const headResponse = await fetch(videoUrl, { method: 'HEAD' });
      console.log("Video HEAD response:", headResponse.status);
      
      if (!headResponse.ok) {
        return new Response(JSON.stringify({ 
          error: "Video file not accessible",
          details: `HTTP ${headResponse.status}: ${headResponse.statusText}`
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const contentLength = parseInt(headResponse.headers.get('content-length') || '0');
      const sizeMB = Math.round(contentLength / 1024 / 1024);
      console.log(`✅ Video accessible: ${sizeMB}MB`);

    } catch (videoError) {
      console.error("❌ Video accessibility test failed:", videoError);
      return new Response(JSON.stringify({ 
        error: "Failed to access video file",
        details: videoError.message
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For now, return a test success response instead of doing actual transcription
    console.log("🎉 All tests passed - returning test response");
    
    return new Response(JSON.stringify({ 
      status: "success",
      message: "Function is working correctly",
      test_results: {
        environment_ok: true,
        assemblyai_connection_ok: true,
        video_accessible: true
      },
      // Return mock segments for testing
      segments: [
        {
          id: 0,
          start: 0,
          end: 3,
          text: "Test transcript segment",
          confidence: 0.95
        }
      ],
      text: "Test transcript segment",
      language: language || "en",
      duration: 3
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("💥 Unexpected error:", error);
    console.error("Error name:", error?.name);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error?.message || String(error),
      errorType: error?.name || "Unknown"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
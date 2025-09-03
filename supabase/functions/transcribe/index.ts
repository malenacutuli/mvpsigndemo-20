import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

serve(async (req) => {
  console.log("=== TRANSCRIBE FUNCTION STARTED ===");
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);

  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight");
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.log("Invalid method, expecting POST");
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    console.log("🔍 Step 1: Reading and parsing request body...");
    const body = await req.text();
    console.log("Body length:", body.length);
    console.log("Body preview:", body.substring(0, 200) + "...");

    let data;
    try {
      data = JSON.parse(body);
      console.log("✅ JSON parsed successfully");
      console.log("Request data keys:", Object.keys(data));
    } catch (parseError) {
      console.error("❌ JSON parse error:", parseError);
      return new Response(JSON.stringify({ 
        error: "Invalid JSON",
        details: parseError.message
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { videoUrl, videoId } = data;
    console.log("Video URL provided:", !!videoUrl);
    console.log("Video ID provided:", videoId || "none");

    console.log("🔑 Step 2: Checking environment variables...");
    const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");
    
    if (!ASSEMBLYAI_API_KEY) {
      console.error("❌ ASSEMBLYAI_API_KEY not found in environment");
      return new Response(JSON.stringify({ 
        error: "AssemblyAI API key not configured",
        details: "Please set the ASSEMBLYAI_API_KEY environment variable"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ ASSEMBLYAI_API_KEY found");
    console.log("API key length:", ASSEMBLYAI_API_KEY.length);
    console.log("API key starts with:", ASSEMBLYAI_API_KEY.substring(0, 10) + "...");

    console.log("🧪 Step 3: Testing AssemblyAI API connectivity...");
    
    let testResponse;
    try {
      testResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
        method: "GET",
        headers: {
          "Authorization": ASSEMBLYAI_API_KEY,
        }
      });
      console.log("API test response status:", testResponse.status);
      console.log("API test response headers:", [...testResponse.headers.entries()]);
    } catch (fetchError) {
      console.error("❌ Failed to connect to AssemblyAI:", fetchError);
      return new Response(JSON.stringify({ 
        error: "Network error connecting to AssemblyAI",
        details: fetchError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (testResponse.status === 401) {
      console.error("❌ AssemblyAI API key is invalid (401)");
      return new Response(JSON.stringify({ 
        error: "Invalid AssemblyAI API key",
        details: "The API key was rejected with 401 Unauthorized"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (testResponse.status === 403) {
      console.error("❌ AssemblyAI API access forbidden (403)");
      return new Response(JSON.stringify({ 
        error: "AssemblyAI API access forbidden",
        details: "The API key doesn't have required permissions"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!testResponse.ok) {
      const errorBody = await testResponse.text();
      console.error("❌ AssemblyAI API test failed:", testResponse.status, errorBody);
      return new Response(JSON.stringify({ 
        error: `AssemblyAI API error: ${testResponse.status}`,
        details: errorBody
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ AssemblyAI API connection successful");

    // If we get here, the API key is working
    // For now, just return success to confirm the setup works
    const result = {
      status: "success",
      message: "AssemblyAI connection verified successfully",
      api_test_status: testResponse.status,
      ready_for_transcription: true,
      // Return mock data for now
      text: "AssemblyAI API is working correctly",
      language: "en",
      duration: 5,
      segments: [{
        id: 0,
        start: 0,
        end: 5,
        text: "AssemblyAI API is working correctly",
        confidence: 1.0
      }]
    };

    console.log("🎉 Returning success response");
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("💥 Unexpected error in function:");
    console.error("Error type:", typeof error);
    console.error("Error name:", error?.name);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    console.error("Full error object:", error);
    
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error?.message || String(error),
      errorType: error?.name || "Unknown",
      stack: error?.stack || "No stack trace available"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
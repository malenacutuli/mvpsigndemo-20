import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

serve(async (req) => {
  console.log("=== TRANSCRIBE FUNCTION STARTED ===");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    console.log("📝 Parsing request...");
    const body = await req.text();
    const data = JSON.parse(body);
    const { videoUrl, videoId } = data;

    console.log("🔑 Checking API key...");
    const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");
    
    if (!ASSEMBLYAI_API_KEY) {
      console.error("❌ No AssemblyAI API key found");
      return new Response(JSON.stringify({ 
        error: "AssemblyAI API key not configured" 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ API key found, length:", ASSEMBLYAI_API_KEY.length);

    console.log("🧪 Testing AssemblyAI API connection...");
    
    // Just make a simple API call to test the connection
    const testResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "GET",
      headers: {
        "Authorization": ASSEMBLYAI_API_KEY,
      }
    });

    console.log("📡 AssemblyAI API test response status:", testResponse.status);

    if (testResponse.status === 401) {
      return new Response(JSON.stringify({ 
        error: "Invalid AssemblyAI API key",
        details: "The API key was rejected by AssemblyAI"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (testResponse.status === 403) {
      return new Response(JSON.stringify({ 
        error: "AssemblyAI API access forbidden",
        details: "The API key doesn't have the required permissions"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ AssemblyAI API connection successful");

    // For now, return mock data to test the complete flow
    const mockResult = {
      text: "This is a test transcript generated successfully.",
      language: "en",
      duration: 10,
      segments: [
        {
          id: 0,
          start: 0,
          end: 5,
          text: "This is a test transcript",
          confidence: 0.95
        },
        {
          id: 1,
          start: 5,
          end: 10,
          text: "generated successfully.",
          confidence: 0.92
        }
      ]
    };

    console.log("🎉 Returning mock transcript with", mockResult.segments.length, "segments");

    return new Response(JSON.stringify(mockResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("💥 Function error:", error);
    console.error("Error name:", error?.name);
    console.error("Error message:", error?.message);
    
    return new Response(JSON.stringify({ 
      error: "Function failed",
      details: error?.message || String(error),
      errorType: error?.name || "Unknown"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
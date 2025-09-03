import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

serve(async (req) => {
  console.log("=== FUNCTION START ===");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Method:", req.method);
    
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Reading body...");
    const body = await req.text();
    console.log("Body length:", body.length);

    console.log("Parsing JSON...");
    const data = JSON.parse(body);
    console.log("Parsed data keys:", Object.keys(data));

    // Just return a simple success response for now
    return new Response(JSON.stringify({ 
      success: true,
      message: "Basic function works",
      receivedData: {
        hasVideoUrl: !!data.videoUrl,
        hasVideoId: !!data.videoId
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      error: "Function failed",
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
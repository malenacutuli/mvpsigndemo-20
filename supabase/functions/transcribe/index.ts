import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

serve(async (req) => {
  console.log("=== ENVIRONMENT TEST ===");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Test all possible environment variable names
    const envTests = {
      ASSEMBLYAI_API_KEY: Deno.env.get("ASSEMBLYAI_API_KEY"),
      assemblyai_api_key: Deno.env.get("assemblyai_api_key"),
      ASSEMBLY_AI_API_KEY: Deno.env.get("ASSEMBLY_AI_API_KEY"),
      OPENAI_API_KEY: Deno.env.get("OPENAI_API_KEY"),
      SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    };

    console.log("Environment variables test:");
    for (const [key, value] of Object.entries(envTests)) {
      console.log(`${key}:`, value ? `Found (length: ${value.length})` : "NOT FOUND");
    }

    // List ALL environment variables
    console.log("All environment variables:");
    const allEnvKeys = [];
    for (const key of Deno.env.toObject()) {
      allEnvKeys.push(Object.keys(key));
    }
    console.log("Available env vars:", Object.keys(Deno.env.toObject()));

    const result = {
      status: "Environment test complete",
      environment_variables: Object.fromEntries(
        Object.entries(envTests).map(([key, value]) => [
          key, 
          value ? `Present (${value.length} chars)` : "Missing"
        ])
      ),
      all_env_keys: Object.keys(Deno.env.toObject()),
      // Return a basic transcript for testing
      text: "Environment test completed",
      segments: [{
        id: 0,
        start: 0,
        end: 1,
        text: "Environment test completed",
        confidence: 1.0
      }]
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Environment test error:", error);
    return new Response(JSON.stringify({ 
      error: "Environment test failed",
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
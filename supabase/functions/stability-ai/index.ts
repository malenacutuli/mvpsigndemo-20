import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { prompt, style_preset = "photographic", aspect_ratio = "1:1", output_format = "png" } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing 'prompt'" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const STABILITY_AI_API_KEY = Deno.env.get("STABILITY_AI_API_KEY");
    if (!STABILITY_AI_API_KEY) {
      return new Response(JSON.stringify({ error: "STABILITY_AI_API_KEY not configured" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("style_preset", style_preset);
    formData.append("aspect_ratio", aspect_ratio);
    formData.append("output_format", output_format);

    const response = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STABILITY_AI_API_KEY}`,
        "Accept": "image/*",
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Stability AI API error:", errorText);
      return new Response(JSON.stringify({ error: "Stability AI API error", details: errorText }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageBuffer = await response.arrayBuffer();
    console.log("Stability AI image generated successfully");

    return new Response(imageBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("Content-Type") || "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error in stability-ai function:", error);
    return new Response(JSON.stringify({ error: "Unexpected error", details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
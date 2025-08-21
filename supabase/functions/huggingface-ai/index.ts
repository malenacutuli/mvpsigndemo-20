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
    const { model, inputs, parameters = {} } = await req.json();

    if (!model || !inputs) {
      return new Response(JSON.stringify({ error: "Missing 'model' or 'inputs'" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const HUGGING_FACE_ACCESS_TOKEN = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
    if (!HUGGING_FACE_ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: "HUGGING_FACE_ACCESS_TOKEN not configured" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HUGGING_FACE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: inputs,
        parameters: parameters,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Hugging Face API error:", errorText);
      return new Response(JSON.stringify({ error: "Hugging Face API error", details: errorText }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if response is JSON or binary (for image models)
    const contentType = response.headers.get("Content-Type");
    if (contentType?.includes("application/json")) {
      const result = await response.json();
      console.log("Hugging Face JSON response generated successfully");
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Handle binary response (e.g., images)
      const binaryData = await response.arrayBuffer();
      console.log("Hugging Face binary response generated successfully");
      return new Response(binaryData, {
        headers: {
          ...corsHeaders,
          "Content-Type": contentType || "application/octet-stream",
          "Cache-Control": "no-store",
        },
      });
    }
  } catch (error) {
    console.error("Error in huggingface-ai function:", error);
    return new Response(JSON.stringify({ error: "Unexpected error", details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
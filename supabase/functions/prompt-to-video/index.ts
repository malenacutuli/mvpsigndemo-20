import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StartBody { action: "start"; prompt: string }
interface StatusBody { action: "status"; id: string }

type Body = StartBody | StatusBody;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Body;

    const RUNWAY_API_KEY = Deno.env.get("RUNWAYML_API_KEY");
    if (!RUNWAY_API_KEY) {
      return new Response(JSON.stringify({ error: "RUNWAYML_API_KEY is not set" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.action === "start") {
      // Create a new generation (Gen-3/4). Endpoint subject to change by provider; logging included.
      const createRes = await fetch("https://api.runwayml.com/v1/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RUNWAY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: body.prompt,
          model: "gen3-alpha", // provider default model name; adjust as needed
          mode: "text-to-video",
          duration: 5,
          resolution: "720p",
          seed: Math.floor(Math.random() * 1000000),
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error("Runway create error:", errText);
        return new Response(JSON.stringify({ error: "Runway create failed", details: errText }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const created = await createRes.json();
      // Expecting { id: string, status: 'queued' | 'processing' }
      return new Response(JSON.stringify({ id: created.id, status: created.status || "queued" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.action === "status") {
      const statusRes = await fetch(`https://api.runwayml.com/v1/generations/${body.id}`, {
        headers: {
          "Authorization": `Bearer ${RUNWAY_API_KEY}`,
        },
      });
      if (!statusRes.ok) {
        const errText = await statusRes.text();
        console.error("Runway status error:", errText);
        return new Response(JSON.stringify({ error: "Runway status failed", details: errText }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const statusJson = await statusRes.json();
      // Expect { status: 'succeeded'|'failed'|'processing', assets: { video: string } }
      const videoUrl = statusJson.assets?.video || statusJson.output?.[0] || null;
      return new Response(JSON.stringify({ status: statusJson.status, videoUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("prompt-to-video error:", error);
    return new Response(JSON.stringify({ error: error.message || "Unexpected error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

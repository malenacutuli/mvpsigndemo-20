import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

interface InputSegment {
  text: string;
  startTime: number;
  endTime: number;
}

interface OutputDescription {
  text: string;
  startTime: number;
  endTime: number;
  voiceStyle: "passionate" | "warm" | "authoritative" | "encouraging";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { segments, contentType } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    const system = `You are generating Audio Descriptions (AD) for blind and low-vision users. 
- Describe only visual context that is NOT already spoken in dialogue.
- Be creative but concise - enhance storytelling, not overwhelm.
- Use cinematic storytelling language like narrating a podcast or radio play.
- Focus on emotions, setting, and atmosphere, not just physical movements.
- Keep each description within its time window [startTime, endTime].
- Return ONLY valid JSON array with fields: text, startTime, endTime, voiceStyle.
- voiceStyle must be one of: passionate, warm, authoritative, encouraging.

STYLE EXAMPLES:
- Instead of "The man picks up a cup" → "John pauses, his hand trembling as he lifts the chipped coffee mug, bracing himself"
- Instead of "A car drives down the street" → "The sleek vehicle glides through rain-soaked city streets, headlights cutting through evening mist"`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify({ contentType: contentType || "education", segments }) }
        ],
        temperature: 0.2,
      }),
    });

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";
    
    // Parse JSON response
    let parsed = [];
    try {
      const jsonStr = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content.trim();
      parsed = JSON.parse(jsonStr);
    } catch (_) {
      parsed = [];
    }

    const descriptions = parsed.map(d => ({
      text: d.text.slice(0, 400),
      startTime: Math.max(0, Number(d.startTime || 0)),
      endTime: Math.max(Number(d.startTime || 0), Number(d.endTime || 0)),
      voiceStyle: ['passionate', 'warm', 'authoritative', 'encouraging'].includes(d.voiceStyle) ? d.voiceStyle : 'warm',
    }));

    return new Response(JSON.stringify({ descriptions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
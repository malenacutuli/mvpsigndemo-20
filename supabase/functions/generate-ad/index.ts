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

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { segments, contentType } = await req.json();

    if (!Array.isArray(segments) || segments.length === 0) {
      return new Response(JSON.stringify({ error: "'segments' array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Trim to a reasonable payload size
    const compact = (segments as InputSegment[]).slice(0, 200).map(s => ({
      text: String(s.text || "").slice(0, 500),
      startTime: Number(s.startTime || 0),
      endTime: Number(s.endTime || (Number(s.startTime || 0) + 2)),
    }));

    const system = `You are generating Audio Descriptions (AD) for blind and low-vision users. 
- Describe only visual context that is NOT already spoken in dialogue.
- Be concise, child-friendly if content is educational.
- Keep each description within its time window [startTime, endTime].
- Use present-tense, neutral narration. Avoid figurative language.
- Return ONLY valid JSON array with fields: text, startTime, endTime, voiceStyle.
- voiceStyle must be one of: passionate, warm, authoritative, encouraging.`;

    const user = {
      role: "user",
      content: JSON.stringify({
        contentType: contentType || "education",
        segments: compact,
      }),
    } as const;

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
          user,
          { role: "user", content: "Produce the JSON array now with concise descriptions per segment." },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: "OpenAI error", details: txt }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";

    // Attempt to parse JSON (strip markdown fences if present)
    const jsonStr = (() => {
      const match = content.match(/```json\n([\s\S]*?)\n```/);
      if (match) return match[1];
      return content.trim();
    })();

    let parsed: OutputDescription[] = [];
    try {
      const arr = JSON.parse(jsonStr);
      if (Array.isArray(arr)) parsed = arr as OutputDescription[];
    } catch (_) {
      // fallback: return empty list
      parsed = [];
    }

    // Basic sanitization
    const descriptions = parsed
      .filter(d => d && typeof d.text === "string")
      .map(d => ({
        text: d.text.slice(0, 400),
        startTime: Math.max(0, Number(d.startTime || 0)),
        endTime: Math.max(Number(d.startTime || 0), Number(d.endTime || 0)),
        voiceStyle: ((): OutputDescription["voiceStyle"] => {
          const v = String(d.voiceStyle || '').toLowerCase();
          return (v === 'passionate' || v === 'warm' || v === 'authoritative' || v === 'encouraging') ? v as any : 'warm';
        })(),
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
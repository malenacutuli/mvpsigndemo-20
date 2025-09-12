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
    const { segments, contentType, language } = await req.json();

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

    const system = `You are an award-winning audio describer crafting cinematic, immersive descriptions for blind and low-vision audiences.
Core principles:
- Describe only meaningful visual information not already conveyed by dialogue.
- Evoke mood, emotion, action, setting, and camera movement; write like a skilled novelist while staying clear and concrete.
- Present tense. Do not say "we see" or "on screen"—describe directly.
- Keep each description concise (typically 4–18 words) and impactful; vary rhythm across items.
- Include emotional cues (gasp, laughter, crying), atmosphere (music, crowd, weather), and key gestures or expressions.
- Never duplicate spoken lines or spoil surprises before they occur. Only summarize on-screen text if essential for comprehension.
Output format (strict JSON array only): [{ "text": string, "voiceStyle": "passionate" | "warm" | "authoritative" | "encouraging" }]
Write all output in the target language provided.`;

    const user = {
      role: "user",
      content: JSON.stringify({
        contentType: contentType || "education",
        language: language || "en",
        guidance: "Propose 6–12 vivid, cinematic audio descriptions that would naturally fit between spoken segments. Do not include time fields; focus on rich, concise descriptions only.",
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
          { role: "user", content: "Return ONLY the JSON array of objects with fields: text, voiceStyle. No prose, no backticks." },
        ],
        temperature: 0.9,
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
        // Times are intentionally set to 0; the client schedules into safe non-dialogue gaps
        startTime: 0,
        endTime: 0,
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
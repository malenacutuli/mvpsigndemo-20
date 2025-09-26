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

    const system = `You are creating professional Audio Descriptions (AD) for blind and visually impaired users. Your job is to describe what's happening visually during silence gaps in the video.

CRITICAL REQUIREMENTS:
- Describe ONLY what is visible on screen - never infer or assume
- Focus on actions, facial expressions, body language, and environmental details
- Be specific and concrete - avoid vague or abstract language
- Use present tense and active voice
- Fit naturally within the time window provided

WHAT TO DESCRIBE:
- People: Who is visible, what they're doing, facial expressions, gestures
- Objects: What items are being handled, moved, or interacted with
- Settings: Where the scene takes place, important visual elements
- Actions: Specific movements, interactions, changes happening on screen
- Spatial relationships: Who/what is where in relation to other elements

ACCESSIBILITY STANDARDS:
- Be precise: "A woman in a red coat opens a wooden door" not "someone does something"
- Include relevant details: clothing, ages, expressions when they add context
- Describe scene changes: new locations, lighting changes, camera movements
- Note non-verbal communication: nods, gestures, eye contact

AVOID:
- Generic phrases like "the scene continues" or "visual elements unfold"
- Describing sounds (that's already audible)
- Overly artistic or flowery language
- Assumptions about emotions unless clearly visible
- Technical camera terms

Return ONLY valid JSON array with fields: text, startTime, endTime, voiceStyle.
voiceStyle must be one of: passionate, warm, authoritative, encouraging.`;

    const userPrompt = `Create specific audio descriptions for these video segments. Each segment needs a description of what's actually visible during that time period:

${JSON.stringify(segments)}

For each segment, describe the specific visual actions, people, objects, and setting details that a blind person would need to understand what's happening on screen.`;

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
          { role: "user", content: userPrompt }
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

    const descriptions = parsed.map((d: any) => ({
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
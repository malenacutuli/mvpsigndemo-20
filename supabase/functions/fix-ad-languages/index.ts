import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { video_id } = await req.json();

    console.log(`Fixing language fields for video: ${video_id}`);

    // Update French descriptions
    const { data: frData, error: frError } = await supabase
      .from("audio_descriptions")
      .update({ language: "fr" })
      .eq("video_id", video_id)
      .eq("language", "en")
      .like("description", "La %")
      .or("description.like.%scène%,description.like.%à%")
      .select();

    if (frError) {
      console.error("Error updating French descriptions:", frError);
    } else {
      console.log(`Updated ${frData?.length || 0} French descriptions`);
    }

    // Update German descriptions
    const { data: deData, error: deError } = await supabase
      .from("audio_descriptions")
      .update({ language: "de" })
      .eq("video_id", video_id)
      .eq("language", "en")
      .or("description.like.Die %,description.like.Der %,description.like.Das %")
      .or("description.like.%mit%,description.like.%und%")
      .select();

    if (deError) {
      console.error("Error updating German descriptions:", deError);
    } else {
      console.log(`Updated ${deData?.length || 0} German descriptions`);
    }

    // Update Spanish descriptions
    const { data: esData, error: esError } = await supabase
      .from("audio_descriptions")
      .update({ language: "es" })
      .eq("video_id", video_id)
      .eq("language", "en")
      .like("description", "La %")
      .or("description.like.%escena%,description.like.%durante%")
      .select();

    if (esError) {
      console.error("Error updating Spanish descriptions:", esError);
    } else {
      console.log(`Updated ${esData?.length || 0} Spanish descriptions`);
    }

    // Update Italian descriptions
    const { data: itData, error: itError } = await supabase
      .from("audio_descriptions")
      .update({ language: "it" })
      .eq("video_id", video_id)
      .eq("language", "en")
      .like("description", "La %")
      .like("description", "%scena%")
      .like("description", "%il %")
      .select();

    if (itError) {
      console.error("Error updating Italian descriptions:", itError);
    } else {
      console.log(`Updated ${itData?.length || 0} Italian descriptions`);
    }

    // Get updated counts
    const { data: summary, error: summaryError } = await supabase
      .from("audio_descriptions")
      .select("language")
      .eq("video_id", video_id);

    const languageCounts = summary?.reduce((acc, item) => {
      acc[item.language] = (acc[item.language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Language fields updated successfully",
        updated: {
          french: frData?.length || 0,
          german: deData?.length || 0,
          spanish: esData?.length || 0,
          italian: itData?.length || 0,
        },
        languageCounts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fixing AD languages:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

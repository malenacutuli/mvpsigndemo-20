import { supabase } from "@/integrations/supabase/client";

export async function fixAdLanguages(videoId: string) {
  console.log(`Fixing language fields for video: ${videoId}`);

  try {
    // Get all audio descriptions for this video
    const { data: allDescriptions, error: fetchError } = await supabase
      .from("audio_descriptions")
      .select("*")
      .eq("video_id", videoId);

    if (fetchError) {
      console.error("Error fetching descriptions:", fetchError);
      return { success: false, error: fetchError };
    }

    let frenchCount = 0;
    let germanCount = 0;
    let spanishCount = 0;
    let italianCount = 0;

    // Update each description based on text patterns
    for (const desc of allDescriptions || []) {
      let newLanguage = desc.language;

      // Detect French
      if (
        desc.language === "en" &&
        desc.description.startsWith("La ") &&
        (desc.description.includes("scène") || desc.description.includes("à"))
      ) {
        newLanguage = "fr";
        frenchCount++;
      }
      // Detect German
      else if (
        desc.language === "en" &&
        (desc.description.startsWith("Die ") ||
          desc.description.startsWith("Der ") ||
          desc.description.startsWith("Das ")) &&
        (desc.description.includes("mit") || desc.description.includes("und"))
      ) {
        newLanguage = "de";
        germanCount++;
      }
      // Detect Spanish
      else if (
        desc.language === "en" &&
        desc.description.startsWith("La ") &&
        (desc.description.includes("escena") || desc.description.includes("durante"))
      ) {
        newLanguage = "es";
        spanishCount++;
      }
      // Detect Italian
      else if (
        desc.language === "en" &&
        desc.description.startsWith("La ") &&
        desc.description.includes("scena") &&
        desc.description.includes("il ")
      ) {
        newLanguage = "it";
        italianCount++;
      }

      // Update if language changed
      if (newLanguage !== desc.language) {
        const { error: updateError } = await supabase
          .from("audio_descriptions")
          .update({ language: newLanguage })
          .eq("id", desc.id);

        if (updateError) {
          console.error(`Error updating description ${desc.id}:`, updateError);
        } else {
          console.log(`Updated description ${desc.id} to ${newLanguage}`);
        }
      }
    }

    console.log("Language field updates complete:", {
      french: frenchCount,
      german: germanCount,
      spanish: spanishCount,
      italian: italianCount,
    });

    return {
      success: true,
      updated: {
        french: frenchCount,
        german: germanCount,
        spanish: spanishCount,
        italian: italianCount,
      },
    };
  } catch (error) {
    console.error("Error fixing AD languages:", error);
    return { success: false, error };
  }
}

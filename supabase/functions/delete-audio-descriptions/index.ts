import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description_ids, delete_translations } = await req.json();

    if (!description_ids || !Array.isArray(description_ids) || description_ids.length === 0) {
      throw new Error('Missing or invalid parameter: description_ids must be a non-empty array');
    }

    console.log('🗑️ Delete request:', { description_ids, delete_translations });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);

    let translationsDeleted = 0;

    // If cascade delete is enabled, delete all translations first
    if (delete_translations) {
      console.log('🔗 Deleting translations for descriptions:', description_ids);
      
      const { data: translations, error: fetchError } = await supabase
        .from('audio_descriptions')
        .select('id')
        .in('source_description_id', description_ids);

      if (fetchError) {
        throw new Error(`Failed to fetch translations: ${fetchError.message}`);
      }

      if (translations && translations.length > 0) {
        const translationIds = translations.map(t => t.id);
        
        const { error: deleteTransError } = await supabase
          .from('audio_descriptions')
          .delete()
          .in('id', translationIds);

        if (deleteTransError) {
          throw new Error(`Failed to delete translations: ${deleteTransError.message}`);
        }

        translationsDeleted = translations.length;
        console.log(`✅ Deleted ${translationsDeleted} translations`);
      }
    }

    // Now delete the original descriptions
    const { error: deleteError } = await supabase
      .from('audio_descriptions')
      .delete()
      .in('id', description_ids);

    if (deleteError) {
      // Check if it's a foreign key constraint violation
      if (deleteError.message?.includes('foreign key') || deleteError.message?.includes('violates')) {
        return new Response(
          JSON.stringify({ 
            error: 'Cannot delete descriptions with existing translations. Please enable "Delete with translations" option.',
            hasTranslations: true 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      throw new Error(`Failed to delete descriptions: ${deleteError.message}`);
    }

    console.log(`✅ Deleted ${description_ids.length} descriptions and ${translationsDeleted} translations`);

    return new Response(
      JSON.stringify({ 
        success: true,
        deleted: description_ids.length,
        translationsDeleted,
        message: `Deleted ${description_ids.length} description(s)${translationsDeleted > 0 ? ` and ${translationsDeleted} translation(s)` : ''}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Delete error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

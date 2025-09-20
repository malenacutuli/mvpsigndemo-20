import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  data?: any;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, videoUrl, action, payload } = await req.json();

    if (!videoId) {
      throw new Error('Video ID is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`🎬 Video Analysis Workflow: ${action} for video ${videoId}`);

    switch (action) {
      case 'start_full_analysis':
        return await startFullAnalysis(supabase, videoId, videoUrl, payload);
      
      case 'get_workflow_status':
        return await getWorkflowStatus(supabase, videoId);
      
      case 'apply_character_mappings':
        return await applyCharacterMappings(supabase, videoId, payload);
      
      case 'save_intonation_settings':
        return await saveIntonationSettings(supabase, videoId, payload);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error: any) {
    console.error('❌ Workflow error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Workflow failed'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function startFullAnalysis(supabase: any, videoId: string, videoUrl: string, options: any = {}) {
  const steps: WorkflowStep[] = [
    { id: 'speaker_analysis', name: 'Analyzing speakers and voices', status: 'pending', progress: 0 },
    { id: 'transcript_extraction', name: 'Extracting transcript with timestamps', status: 'pending', progress: 0 },
    { id: 'speaker_assignment', name: 'Assigning segments to speakers', status: 'pending', progress: 0 },
    { id: 'character_setup', name: 'Setting up character framework', status: 'pending', progress: 0 }
  ];

  // Store initial workflow state
  await supabase
    .from('content_generation_cache')
    .upsert({
      video_id: videoId,
      content_type: 'analysis_workflow',
      language: options.language || 'en',
      generation_params: { started_at: new Date().toISOString(), options },
      result_data: { steps, current_step: 'speaker_analysis' }
    });

  // Step 1: Speaker Diarization
  console.log('🎤 Starting speaker diarization...');
  updateWorkflowStep(supabase, videoId, 'speaker_analysis', 'running', 10);

  const diarizationResponse = await supabase.functions.invoke('speaker-diarization', {
    body: {
      videoUrl,
      videoId,
      analysisDepth: options.analysisDepth || 'standard',
      confidenceThreshold: options.confidenceThreshold || 0.6
    }
  });

  if (diarizationResponse.error) {
    await updateWorkflowStep(supabase, videoId, 'speaker_analysis', 'error', 0, diarizationResponse.error.message);
    throw new Error(`Speaker analysis failed: ${diarizationResponse.error.message}`);
  }

  const speakerData = diarizationResponse.data;
  await updateWorkflowStep(supabase, videoId, 'speaker_analysis', 'completed', 100, speakerData);

  // Step 2: Transcript Extraction (if not already done)
  console.log('📝 Extracting transcript...');
  await updateWorkflowStep(supabase, videoId, 'transcript_extraction', 'running', 25);

  const transcriptResponse = await supabase.functions.invoke('transcribe', {
    body: {
      videoUrl,
      videoId,
      language: options.language || 'en'
    }
  });

  if (transcriptResponse.error) {
    await updateWorkflowStep(supabase, videoId, 'transcript_extraction', 'error', 0, transcriptResponse.error.message);
    throw new Error(`Transcript extraction failed: ${transcriptResponse.error.message}`);
  }

  await updateWorkflowStep(supabase, videoId, 'transcript_extraction', 'completed', 100);

  // Step 3: Speaker Assignment Verification
  console.log('🔄 Verifying speaker assignments...');
  await updateWorkflowStep(supabase, videoId, 'speaker_assignment', 'running', 75);

  // Get current transcript segments to verify speaker assignments
  const { data: segments } = await supabase
    .from('transcript_segments')
    .select('*')
    .eq('video_id', videoId)
    .order('start_time');

  await updateWorkflowStep(supabase, videoId, 'speaker_assignment', 'completed', 100, { 
    total_segments: segments?.length || 0,
    speakers_detected: speakerData.speakers?.length || 0
  });

  // Step 4: Character Framework Setup
  console.log('👥 Setting up character framework...');
  await updateWorkflowStep(supabase, videoId, 'character_setup', 'running', 90);

  // Create initial character suggestions based on speaker analysis
  const characterSuggestions = speakerData.speakers?.map((speaker: any, index: number) => ({
    suggested_name: `Character ${index + 1}`,
    speaker_id: speaker.id,
    suggested_type: index === 0 ? 'main' : index < 3 ? 'supporting' : 'minor',
    speaking_time: speaker.totalTimeSeconds,
    confidence: speaker.confidence
  })) || [];

  await updateWorkflowStep(supabase, videoId, 'character_setup', 'completed', 100, {
    character_suggestions: characterSuggestions,
    ready_for_user_input: true
  });

  // Final workflow completion
  await supabase
    .from('content_generation_cache')
    .upsert({
      video_id: videoId,
      content_type: 'analysis_workflow',
      language: options.language || 'en',
      generation_params: { completed_at: new Date().toISOString(), options },
      result_data: { 
        steps: steps.map(s => s.id === 'character_setup' ? { ...s, status: 'completed', progress: 100 } : s),
        current_step: 'completed',
        speaker_data: speakerData,
        character_suggestions: characterSuggestions,
        ready_for_user_configuration: true
      }
    });

  return new Response(
    JSON.stringify({
      success: true,
      workflow_complete: true,
      speaker_data: speakerData,
      character_suggestions: characterSuggestions,
      total_segments: segments?.length || 0,
      next_step: 'user_character_configuration'
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function getWorkflowStatus(supabase: any, videoId: string) {
  const { data } = await supabase
    .from('content_generation_cache')
    .select('result_data')
    .eq('video_id', videoId)
    .eq('content_type', 'analysis_workflow')
    .single();

  return new Response(
    JSON.stringify({
      success: true,
      workflow_data: data?.result_data || { steps: [], current_step: 'not_started' }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function applyCharacterMappings(supabase: any, videoId: string, payload: any) {
  console.log('🎭 Applying character mappings:', payload);
  
  const { characters, speaker_mappings, language = 'en' } = payload;

  // Apply character data to database
  for (const character of characters) {
    await supabase
      .from('characters')
      .upsert({
        video_id: videoId,
        name: character.name,
        type: character.type,
        color: character.color,
        is_off_camera: character.isOffCamera || false,
        voice_id: character.voiceId,
        voice_name: character.voiceName,
        voice_type: character.voiceType,
        emphasis: character.emphasis || 'normal',
        pitch: character.pitch || 'normal'
      });
  }

  // Apply speaker mappings to transcript segments
  for (const [originalSpeaker, characterName] of Object.entries(speaker_mappings)) {
    const character = characters.find((c: any) => c.name === characterName);
    if (character) {
      await supabase
        .from('transcript_segments')
        .update({
          speaker: characterName,
          speaker_color: character.color,
          is_off_camera: character.isOffCamera || false
        })
        .eq('video_id', videoId)
        .eq('language', language)
        .eq('speaker', originalSpeaker);
    }
  }

  // Store speaker mappings
  await supabase
    .from('speaker_mappings')
    .upsert({
      video_id: videoId,
      language,
      mappings: speaker_mappings,
      created_by: null // System-generated
    });

  return new Response(
    JSON.stringify({
      success: true,
      characters_applied: characters.length,
      mappings_applied: Object.keys(speaker_mappings).length
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function saveIntonationSettings(supabase: any, videoId: string, payload: any) {
  console.log('🎵 Saving intonation settings:', payload);
  
  const { segment_updates, language = 'en' } = payload;

  // Apply intonation updates to transcript segments
  for (const update of segment_updates) {
    await supabase
      .from('transcript_segments')
      .update({
        emphasis: update.emphasis,
        pitch: update.pitch,
        // Store word-level intonation in words jsonb field
        words: update.words
      })
      .eq('id', update.segment_id);
  }

  return new Response(
    JSON.stringify({
      success: true,
      segments_updated: segment_updates.length
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function updateWorkflowStep(supabase: any, videoId: string, stepId: string, status: string, progress: number, data?: any) {
  // Get current workflow data
  const { data: current } = await supabase
    .from('content_generation_cache')
    .select('result_data')
    .eq('video_id', videoId)
    .eq('content_type', 'analysis_workflow')
    .single();

  if (current?.result_data) {
    const workflowData = current.result_data;
    const updatedSteps = workflowData.steps.map((step: any) => 
      step.id === stepId 
        ? { ...step, status, progress, ...(data && { data }) }
        : step
    );

    await supabase
      .from('content_generation_cache')
      .update({
        result_data: {
          ...workflowData,
          steps: updatedSteps,
          current_step: stepId,
          last_updated: new Date().toISOString()
        }
      })
      .eq('video_id', videoId)
      .eq('content_type', 'analysis_workflow');
  }
}
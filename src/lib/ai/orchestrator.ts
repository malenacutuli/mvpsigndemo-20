/**
 * AI Orchestrator - Descript Underlord equivalent for Premium Video Editor
 * Provides natural language video editing capabilities through Google Gemini AI
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/integrations/supabase/client';

/**
 * Standard API response format
 */
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Transcript segment from database
 */
interface TranscriptSegment {
  id: string;
  video_id: string;
  start_time: number;
  end_time: number;
  text: string;
  speaker?: string;
  confidence?: number;
}

/**
 * AI-generated suggestion for video editing
 */
interface AISuggestion {
  id?: string;
  video_id: string;
  project_id?: string;
  suggestion_type: 'filler-word' | 'highlight' | 'chapter' | 'retake' | 'silent-gap' | 'bad-take' | 'layout-change' | 'caption-style' | 'transition' | 'media-suggestion';
  start_time: number;
  end_time: number;
  confidence: number;
  reason: string;
  suggested_action: string;
  action_parameters?: any;
  status?: 'pending' | 'applied' | 'dismissed';
  model_name?: string;
  model_version?: string;
}

/**
 * Detected filler word in transcript
 */
interface FillerWord {
  segmentId: string;
  startTime: number;
  endTime: number;
  text: string;
  reason: string;
  confidence: number;
}

/**
 * Generated highlight clip
 */
interface Highlight {
  startTime: number;
  endTime: number;
  score: number;
  reason: string;
  title: string;
}

/**
 * Generated chapter marker
 */
interface Chapter {
  startTime: number;
  title: string;
  description: string;
}

/**
 * Segment recommended for removal
 */
interface SegmentToRemove {
  segmentId: string;
  startTime: number;
  endTime: number;
  duration: number;
  reason: string;
}

// Initialize Gemini AI with optimal settings for video editing
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

/**
 * Get Gemini model instance with optimized settings for video editing
 * @returns Configured Gemini model
 */
const getModel = () => {
  return genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0.1,  // Very low for precise, consistent editing decisions
      topP: 0.8,
      topK: 10,
      maxOutputTokens: 8192
    }
  });
};

/**
 * AI Orchestrator class for intelligent video editing operations
 */
export class AIOrchestrator {
  /**
   * Execute a natural language editing command
   * This is the main entry point for AI-powered editing
   * 
   * @param videoId - The video to edit
   * @param command - Natural language command (e.g., "remove all filler words")
   * @param projectId - Optional project ID for scene-based editing
   * @returns APIResponse with execution result
   * 
   * @example
   * const result = await aiOrchestrator.executeCommand(
   *   'video-123',
   *   'remove all the ums and uhs'
   * );
   */
  async executeCommand(
    videoId: string,
    command: string,
    projectId?: string
  ): Promise<APIResponse> {
    try {
      console.log('[AI Orchestrator] Executing command:', command);
      
      // Parse the command to understand intent
      const parsedCommand = await this.parseCommand(command);
      console.log('[AI Orchestrator] Parsed command type:', parsedCommand.type);
      
      // Route to appropriate handler
      switch (parsedCommand.type) {
        case 'remove-filler-words':
          return await this.removeFillerWords(videoId, projectId);
        
        case 'generate-highlights':
          return await this.generateHighlights(
            videoId,
            parsedCommand.parameters?.criteria || 'key-points',
            projectId
          );
        
        case 'generate-chapters':
          return await this.generateChapters(videoId, projectId);
        
        case 'shorten-to-duration':
          return await this.shortenToDuration(
            videoId,
            parsedCommand.parameters?.targetDuration || 60,
            projectId
          );
        
        case 'detect-retakes':
          return await this.detectRetakes(videoId, projectId);
        
        case 'suggest-transitions':
          return await this.suggestTransitions(videoId, projectId);
        
        default:
          return {
            success: false,
            error: {
              code: 'UNKNOWN_COMMAND',
              message: `Command type "${parsedCommand.type}" not recognized`
            }
          };
      }
      
    } catch (error: any) {
      console.error('[AI Orchestrator] executeCommand error:', error);
      return {
        success: false,
        error: {
          code: 'EXECUTE_COMMAND_FAILED',
          message: error.message || 'Failed to execute command',
          details: error
        }
      };
    }
  }

  /**
   * Parse natural language command into structured format using AI
   * 
   * @param command - Natural language command
   * @returns Parsed command with type and parameters
   * 
   * @example
   * const parsed = await parseCommand('make it 2 minutes long');
   * // Returns: { type: 'shorten-to-duration', parameters: { targetDuration: 120 } }
   */
  async parseCommand(command: string): Promise<{ type: string; parameters?: any }> {
    try {
      console.log('[AI Orchestrator] Parsing command:', command);
      const model = getModel();
      
      const prompt = `You are a video editing assistant. Parse this natural language command into a structured format.

Command: "${command}"

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "type": "command-type",
  "parameters": {}
}

Valid command types:
- remove-filler-words: Remove um, uh, like, you know, etc.
- generate-highlights: Create highlight clips (parameters: criteria: "humor" | "insights" | "action" | "key-points")
- generate-chapters: Add chapter markers (no parameters)
- shorten-to-duration: Reduce video length (parameters: targetDuration: number in seconds)
- detect-retakes: Find repeated takes (no parameters)
- suggest-transitions: Recommend transitions (no parameters)

Examples:
"remove all the ums and uhs" → {"type": "remove-filler-words"}
"create funny highlights" → {"type": "generate-highlights", "parameters": {"criteria": "humor"}}
"add chapters" → {"type": "generate-chapters"}
"make it 2 minutes long" → {"type": "shorten-to-duration", "parameters": {"targetDuration": 120}}

Return JSON only:`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Clean response (remove markdown if present)
      const parsed = this.parseAIResponse<{ type: string; parameters?: any }>(responseText);
      
      console.log('[AI Orchestrator] Parsed command:', parsed);
      return parsed;
      
    } catch (error: any) {
      console.error('[AI Orchestrator] parseCommand error:', error);
      
      // Fallback: Simple pattern matching
      const lowerCommand = command.toLowerCase();
      if (lowerCommand.includes('filler') || lowerCommand.includes('um') || lowerCommand.includes('uh')) {
        console.log('[AI Orchestrator] Fallback: detected filler word command');
        return { type: 'remove-filler-words' };
      } else if (lowerCommand.includes('highlight')) {
        console.log('[AI Orchestrator] Fallback: detected highlight command');
        return { type: 'generate-highlights' };
      } else if (lowerCommand.includes('chapter')) {
        console.log('[AI Orchestrator] Fallback: detected chapter command');
        return { type: 'generate-chapters' };
      } else if (lowerCommand.includes('shorten') || lowerCommand.includes('shorter')) {
        console.log('[AI Orchestrator] Fallback: detected shorten command');
        return { type: 'shorten-to-duration', parameters: { targetDuration: 60 } };
      }
      
      console.warn('[AI Orchestrator] Could not parse command, returning unknown');
      return { type: 'unknown' };
    }
  }

  /**
   * Remove filler words from transcript
   * Detects: um, uh, like, you know, so, actually, basically, etc.
   * 
   * @param videoId - Video to analyze
   * @param projectId - Optional project ID
   * @returns APIResponse with detected filler words
   * 
   * @example
   * const result = await removeFillerWords('video-123');
   * console.log(`Found ${result.data.count} filler words`);
   */
  async removeFillerWords(
    videoId: string,
    projectId?: string
  ): Promise<APIResponse<{ detected: FillerWord[]; count: number }>> {
    try {
      console.log('[AI Orchestrator] Removing filler words for video:', videoId);
      
      // Step 1: Load transcript
      const segments = await this.loadTranscript(videoId);
      if (!segments || segments.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_TRANSCRIPT',
            message: 'No transcript found for this video'
          }
        };
      }
      
      // Step 2: Format transcript for AI
      const transcriptText = this.formatTranscriptForAI(segments);
      
      // Step 3: Use Gemini to identify filler words
      const model = getModel();
      const prompt = `Analyze this video transcript and identify ALL filler words and phrases.

Common filler words to detect:
- um, uh, er, ah
- like, you know, I mean
- so, actually, basically, literally
- kind of, sort of
- right, okay, well

Transcript:
${transcriptText}

For each filler word detected, return JSON:
{
  "fillers": [
    {
      "segmentId": "extract from [time] markers",
      "startTime": number (in seconds),
      "endTime": number (in seconds),
      "text": "the filler word/phrase",
      "reason": "brief explanation why this is a filler",
      "confidence": 0.0-1.0 (how confident you are this is a filler)
    }
  ]
}

Only include segments that are clearly filler words. Be conservative - don't flag words that add meaning.
Return ONLY valid JSON (no markdown, no explanation):`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Step 4: Parse AI response
      const parsed = this.parseAIResponse<{ fillers: FillerWord[] }>(responseText);
      
      console.log('[AI Orchestrator] Detected fillers:', parsed.fillers.length);
      
      // Step 5: Create AI suggestions for each filler
      for (const filler of parsed.fillers) {
        await this.createSuggestion({
          video_id: videoId,
          project_id: projectId,
          suggestion_type: 'filler-word',
          start_time: filler.startTime,
          end_time: filler.endTime,
          confidence: filler.confidence,
          reason: filler.reason,
          suggested_action: 'remove',
          action_parameters: {
            text: filler.text,
            segmentId: filler.segmentId
          }
        });
      }
      
      return {
        success: true,
        data: {
          detected: parsed.fillers,
          count: parsed.fillers.length
        }
      };
      
    } catch (error: any) {
      console.error('[AI Orchestrator] removeFillerWords error:', error);
      return {
        success: false,
        error: {
          code: 'REMOVE_FILLER_WORDS_FAILED',
          message: error.message || 'Failed to remove filler words',
          details: error
        }
      };
    }
  }

  /**
   * Generate highlight clips from video
   * 
   * @param videoId - Video to analyze
   * @param criteria - What to look for (humor, insights, action, key-points)
   * @param projectId - Optional project ID
   * @returns APIResponse with generated highlights
   * 
   * @example
   * const result = await generateHighlights('video-123', 'humor');
   */
  async generateHighlights(
    videoId: string,
    criteria: 'humor' | 'insights' | 'action' | 'key-points' = 'key-points',
    projectId?: string
  ): Promise<APIResponse<{ highlights: Highlight[]; count: number }>> {
    try {
      console.log('[AI Orchestrator] Generating highlights with criteria:', criteria);
      
      // Step 1: Load transcript
      const segments = await this.loadTranscript(videoId);
      if (!segments || segments.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_TRANSCRIPT',
            message: 'No transcript found for this video'
          }
        };
      }
      
      // Step 2: Format transcript
      const transcriptText = this.formatTranscriptForAI(segments);
      
      // Step 3: Get video duration
      const duration = segments[segments.length - 1]?.end_time || 0;
      
      // Step 4: Use Gemini to find best moments
      const model = getModel();
      const criteriaInstructions = {
        humor: 'funny moments, jokes, laughter, amusing situations',
        insights: 'key insights, important revelations, aha moments, valuable information',
        action: 'exciting moments, high energy, important events, dramatic scenes',
        'key-points': 'most important points, main takeaways, core messages, essential content'
      };
      
      const prompt = `Analyze this video transcript and identify the BEST moments for a highlight reel.

Criteria: ${criteriaInstructions[criteria]}
Video duration: ${duration.toFixed(1)} seconds

Transcript:
${transcriptText}

Create 3-5 highlight clips that:
- Are 10-30 seconds long each
- Capture the best ${criteria} moments
- Have clear start and end points
- Tell a complete mini-story
- Work well as standalone clips

Return JSON:
{
  "highlights": [
    {
      "startTime": number (in seconds),
      "endTime": number (in seconds),
      "score": 0-100 (how good this highlight is),
      "reason": "detailed explanation why this is a great highlight",
      "title": "catchy title for this clip (3-5 words)"
    }
  ]
}

Return ONLY valid JSON (no markdown):`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Step 5: Parse AI response
      const parsed = this.parseAIResponse<{ highlights: Highlight[] }>(responseText);
      
      console.log('[AI Orchestrator] Generated highlights:', parsed.highlights.length);
      
      // Step 6: Create AI suggestions for each highlight
      for (const highlight of parsed.highlights) {
        await this.createSuggestion({
          video_id: videoId,
          project_id: projectId,
          suggestion_type: 'highlight',
          start_time: highlight.startTime,
          end_time: highlight.endTime,
          confidence: highlight.score / 100,
          reason: highlight.reason,
          suggested_action: 'create-clip',
          action_parameters: {
            title: highlight.title,
            score: highlight.score,
            criteria: criteria
          }
        });
        
        // If project exists, create actual scene
        if (projectId) {
          await supabase
            .from('project_scenes')
            .insert({
              project_id: projectId,
              video_id: videoId,
              name: highlight.title,
              scene_order: 0,
              duration_seconds: highlight.endTime - highlight.startTime,
              timeline_start: highlight.startTime,
              timeline_end: highlight.endTime,
              layout_type: 'fullscreen',
              background_type: 'solid',
              transition_type: 'fade',
              transition_duration_ms: 500,
              media_type: 'video',
              media_start_time: highlight.startTime,
              media_end_time: highlight.endTime,
              visual_description: `Highlight: ${highlight.reason}`
            });
        }
      }
      
      return {
        success: true,
        data: {
          highlights: parsed.highlights,
          count: parsed.highlights.length
        }
      };
      
    } catch (error: any) {
      console.error('[AI Orchestrator] generateHighlights error:', error);
      return {
        success: false,
        error: {
          code: 'GENERATE_HIGHLIGHTS_FAILED',
          message: error.message || 'Failed to generate highlights',
          details: error
        }
      };
    }
  }

  /**
   * Generate chapter markers for video
   * 
   * @param videoId - Video to analyze
   * @param projectId - Optional project ID
   * @returns APIResponse with generated chapters
   * 
   * @example
   * const result = await generateChapters('video-123');
   */
  async generateChapters(
    videoId: string,
    projectId?: string
  ): Promise<APIResponse<{ chapters: Chapter[]; count: number }>> {
    try {
      console.log('[AI Orchestrator] Generating chapters for video:', videoId);
      
      const segments = await this.loadTranscript(videoId);
      if (!segments || segments.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_TRANSCRIPT',
            message: 'No transcript found for this video'
          }
        };
      }
      
      const transcriptText = this.formatTranscriptForAI(segments);
      const model = getModel();
      
      const prompt = `Analyze this video transcript and identify natural chapter breaks.

Transcript:
${transcriptText}

Create 5-10 chapters that:
- Mark natural topic transitions
- Have clear, descriptive titles (3-5 words)
- Are evenly distributed throughout the video
- Group related content together

Return JSON:
{
  "chapters": [
    {
      "startTime": number (in seconds),
      "title": "Chapter Title",
      "description": "Brief 1-sentence summary of this chapter"
    }
  ]
}

Return ONLY valid JSON (no markdown):`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = this.parseAIResponse<{ chapters: Chapter[] }>(responseText);
      
      console.log('[AI Orchestrator] Generated chapters:', parsed.chapters.length);
      
      for (const chapter of parsed.chapters) {
        await this.createSuggestion({
          video_id: videoId,
          project_id: projectId,
          suggestion_type: 'chapter',
          start_time: chapter.startTime,
          end_time: chapter.startTime,
          confidence: 0.85,
          reason: chapter.description,
          suggested_action: 'add-marker',
          action_parameters: {
            title: chapter.title,
            description: chapter.description
          }
        });
      }
      
      return {
        success: true,
        data: {
          chapters: parsed.chapters,
          count: parsed.chapters.length
        }
      };
      
    } catch (error: any) {
      console.error('[AI Orchestrator] generateChapters error:', error);
      return {
        success: false,
        error: {
          code: 'GENERATE_CHAPTERS_FAILED',
          message: error.message || 'Failed to generate chapters',
          details: error
        }
      };
    }
  }

  /**
   * Shorten video to target duration
   * 
   * @param videoId - Video to analyze
   * @param targetDuration - Desired duration in seconds
   * @param projectId - Optional project ID
   * @returns APIResponse with suggested removals
   * 
   * @example
   * const result = await shortenToDuration('video-123', 120); // 2 minutes
   */
  async shortenToDuration(
    videoId: string,
    targetDuration: number,
    projectId?: string
  ): Promise<APIResponse<{ segments: SegmentToRemove[]; totalRemoved: number }>> {
    try {
      console.log('[AI Orchestrator] Shortening video to', targetDuration, 'seconds');
      
      const segments = await this.loadTranscript(videoId);
      if (!segments || segments.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_TRANSCRIPT',
            message: 'No transcript found for this video'
          }
        };
      }
      
      const currentDuration = segments[segments.length - 1]?.end_time || 0;
      const reductionNeeded = currentDuration - targetDuration;
      
      if (reductionNeeded <= 0) {
        return {
          success: false,
          error: {
            code: 'ALREADY_SHORT_ENOUGH',
            message: `Video is already ${currentDuration.toFixed(1)}s, shorter than target ${targetDuration}s`
          }
        };
      }
      
      const transcriptText = this.formatTranscriptForAI(segments);
      const model = getModel();
      
      const prompt = `This video is ${currentDuration.toFixed(1)} seconds long and needs to be shortened to ${targetDuration} seconds.
You need to remove approximately ${reductionNeeded.toFixed(1)} seconds of content.

Transcript (with durations):
${transcriptText}

Identify segments to remove while:
- Preserving the core message and key points
- Maintaining narrative flow
- Prioritizing removal of:
  * Long pauses or silence
  * Repetitive content
  * Tangential points
  * Less important details

Return JSON with segments to remove:
{
  "segments": [
    {
      "segmentId": "extract from [time] markers",
      "startTime": number,
      "endTime": number,
      "duration": number,
      "reason": "why this can be safely removed"
    }
  ]
}

Make sure the total duration of removed segments is approximately ${reductionNeeded.toFixed(1)} seconds.
Return ONLY valid JSON (no markdown):`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = this.parseAIResponse<{ segments: SegmentToRemove[] }>(responseText);
      
      const totalRemoved = parsed.segments.reduce((sum, s) => sum + s.duration, 0);
      
      console.log('[AI Orchestrator] Suggested', parsed.segments.length, 'cuts totaling', totalRemoved.toFixed(1), 'seconds');
      
      for (const segment of parsed.segments) {
        await this.createSuggestion({
          video_id: videoId,
          project_id: projectId,
          suggestion_type: 'silent-gap',
          start_time: segment.startTime,
          end_time: segment.endTime,
          confidence: 0.75,
          reason: segment.reason,
          suggested_action: 'remove',
          action_parameters: {
            duration: segment.duration,
            segmentId: segment.segmentId
          }
        });
      }
      
      return {
        success: true,
        data: {
          segments: parsed.segments,
          totalRemoved: totalRemoved
        }
      };
      
    } catch (error: any) {
      console.error('[AI Orchestrator] shortenToDuration error:', error);
      return {
        success: false,
        error: {
          code: 'SHORTEN_DURATION_FAILED',
          message: error.message || 'Failed to shorten video',
          details: error
        }
      };
    }
  }

  /**
   * Detect retakes and repeated content
   * 
   * @param videoId - Video to analyze
   * @param projectId - Optional project ID
   * @returns APIResponse with detected retakes
   * 
   * @example
   * const result = await detectRetakes('video-123');
   */
  async detectRetakes(
    videoId: string,
    projectId?: string
  ): Promise<APIResponse<{ retakes: any[]; count: number }>> {
    try {
      console.log('[AI Orchestrator] Detecting retakes for video:', videoId);
      
      const segments = await this.loadTranscript(videoId);
      if (!segments || segments.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_TRANSCRIPT',
            message: 'No transcript found'
          }
        };
      }
      
      const transcriptText = this.formatTranscriptForAI(segments);
      const model = getModel();
      
      const prompt = `Analyze this transcript and identify likely retakes, false starts, and repeated attempts.

Look for:
- Repeated phrases or sentences
- False starts (starting a sentence, stopping, starting again)
- Multiple attempts at saying the same thing

Transcript:
${transcriptText}

Return JSON:
{
  "retakes": [
    {
      "startTime": number,
      "endTime": number,
      "reason": "why this is likely a retake",
      "confidence": 0.0-1.0
    }
  ]
}

Return ONLY valid JSON (no markdown):`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = this.parseAIResponse<{ retakes: any[] }>(responseText);
      
      console.log('[AI Orchestrator] Detected retakes:', parsed.retakes.length);
      
      for (const retake of parsed.retakes) {
        await this.createSuggestion({
          video_id: videoId,
          project_id: projectId,
          suggestion_type: 'retake',
          start_time: retake.startTime,
          end_time: retake.endTime,
          confidence: retake.confidence,
          reason: retake.reason,
          suggested_action: 'remove',
          action_parameters: retake
        });
      }
      
      return {
        success: true,
        data: {
          retakes: parsed.retakes,
          count: parsed.retakes.length
        }
      };
      
    } catch (error: any) {
      console.error('[AI Orchestrator] detectRetakes error:', error);
      return {
        success: false,
        error: {
          code: 'DETECT_RETAKES_FAILED',
          message: error.message || 'Failed to detect retakes',
          details: error
        }
      };
    }
  }

  /**
   * Suggest appropriate transitions between scenes
   * 
   * @param videoId - Video to analyze
   * @param projectId - Optional project ID
   * @returns APIResponse with transition suggestions
   * 
   * @example
   * const result = await suggestTransitions('video-123', 'project-456');
   */
  async suggestTransitions(
    videoId: string,
    projectId?: string
  ): Promise<APIResponse<{ suggestions: any[]; count: number }>> {
    try {
      console.log('[AI Orchestrator] Suggesting transitions for video:', videoId);
      
      if (!projectId) {
        return {
          success: false,
          error: {
            code: 'PROJECT_REQUIRED',
            message: 'Project ID required for transition suggestions'
          }
        };
      }
      
      const { data: scenes } = await supabase
        .from('project_scenes')
        .select('*')
        .eq('project_id', projectId)
        .order('scene_order', { ascending: true });
      
      if (!scenes || scenes.length < 2) {
        return {
          success: false,
          error: {
            code: 'NOT_ENOUGH_SCENES',
            message: 'Need at least 2 scenes for transition suggestions'
          }
        };
      }
      
      const model = getModel();
      const sceneDescriptions = scenes.map(s =>
        `Scene ${s.scene_order}: "${s.name}" (${s.duration_seconds}s, layout: ${s.layout_type})`
      ).join('\n');
      
      const prompt = `Analyze these video scenes and suggest the best transition for each scene change.

Scenes:
${sceneDescriptions}

Available transitions:
- none: No transition (hard cut)
- fade: Gradual fade
- crossfade: Overlapping fade
- wipe-left/right/up/down: Directional wipe
- blur: Motion blur
- zoom: Zoom in/out
- slide: Slide transition

Return JSON:
{
  "suggestions": [
    {
      "fromScene": 0,
      "toScene": 1,
      "recommendedTransition": "transition-type",
      "duration": milliseconds (300-1000),
      "reason": "why this transition works best"
    }
  ]
}

Return ONLY valid JSON (no markdown):`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = this.parseAIResponse<{ suggestions: any[] }>(responseText);
      
      console.log('[AI Orchestrator] Generated transition suggestions:', parsed.suggestions.length);
      
      for (const suggestion of parsed.suggestions) {
        const scene = scenes.find(s => s.scene_order === suggestion.fromScene);
        if (scene) {
          await supabase
            .from('project_scenes')
            .update({
              transition_type: suggestion.recommendedTransition,
              transition_duration_ms: suggestion.duration
            })
            .eq('id', scene.id);
          
          await this.createSuggestion({
            video_id: videoId,
            project_id: projectId,
            suggestion_type: 'transition',
            start_time: scene.timeline_end,
            end_time: scene.timeline_end,
            confidence: 0.8,
            reason: suggestion.reason,
            suggested_action: 'apply-transition',
            action_parameters: suggestion
          });
        }
      }
      
      return {
        success: true,
        data: {
          suggestions: parsed.suggestions,
          count: parsed.suggestions.length
        }
      };
      
    } catch (error: any) {
      console.error('[AI Orchestrator] suggestTransitions error:', error);
      return {
        success: false,
        error: {
          code: 'SUGGEST_TRANSITIONS_FAILED',
          message: error.message || 'Failed to suggest transitions',
          details: error
        }
      };
    }
  }

  /**
   * Load transcript segments from database
   * 
   * @private
   * @param videoId - Video ID to load transcript for
   * @returns Array of transcript segments
   */
  private async loadTranscript(videoId: string): Promise<TranscriptSegment[]> {
    try {
      console.log('[AI Orchestrator] Loading transcript for video:', videoId);
      
      const { data: segments, error } = await supabase
        .from('transcript_segments_clean')
        .select('*')
        .eq('video_id', videoId)
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      
      console.log(`[AI Orchestrator] Loaded ${segments?.length || 0} segments`);
      return segments as TranscriptSegment[];
      
    } catch (error: any) {
      console.error('[AI Orchestrator] loadTranscript error:', error);
      throw new Error('Failed to load transcript');
    }
  }

  /**
   * Create AI suggestion in database
   * 
   * @private
   * @param suggestion - Suggestion data to store
   */
  private async createSuggestion(suggestion: AISuggestion): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_suggestions')
        .insert({
          video_id: suggestion.video_id,
          project_id: suggestion.project_id,
          suggestion_type: suggestion.suggestion_type,
          start_time: suggestion.start_time,
          end_time: suggestion.end_time,
          confidence: suggestion.confidence,
          reason: suggestion.reason,
          suggested_action: suggestion.suggested_action,
          action_parameters: suggestion.action_parameters,
          status: suggestion.status || 'pending',
          model_name: suggestion.model_name || 'gemini-2.0-flash-exp',
          model_version: '2.0'
        });
      
      if (error) throw error;
      
    } catch (error: any) {
      console.error('[AI Orchestrator] createSuggestion error:', error);
      throw error;
    }
  }

  /**
   * Format transcript segments for AI analysis
   * 
   * @private
   * @param segments - Transcript segments to format
   * @returns Formatted transcript string with timestamps
   */
  private formatTranscriptForAI(segments: TranscriptSegment[]): string {
    return segments
      .map(s => `[${s.start_time.toFixed(2)}-${s.end_time.toFixed(2)}] ${s.speaker || 'Speaker'}: ${s.text}`)
      .join('\n');
  }

  /**
   * Strip markdown formatting from AI response
   * 
   * @private
   * @param text - Raw AI response text
   * @returns Cleaned text without markdown
   */
  private stripMarkdown(text: string): string {
    return text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
  }

  /**
   * Parse JSON response from AI with error handling
   * 
   * @private
   * @param responseText - Raw AI response
   * @returns Parsed JSON object
   * @throws Error if JSON parsing fails
   */
  private parseAIResponse<T>(responseText: string): T {
    try {
      const cleaned = this.stripMarkdown(responseText);
      return JSON.parse(cleaned) as T;
    } catch (error: any) {
      console.error('[AI Orchestrator] JSON parse error:', error);
      console.error('[AI Orchestrator] Raw response:', responseText);
      throw new Error('Failed to parse AI response as JSON');
    }
  }
}

// Export singleton instance
export const aiOrchestrator = new AIOrchestrator();

/*
// TEST USAGE:
import { aiOrchestrator } from './orchestrator';

// Natural language commands
await aiOrchestrator.executeCommand('video-123', 'remove all filler words');
await aiOrchestrator.executeCommand('video-123', 'create funny highlights');
await aiOrchestrator.executeCommand('video-123', 'add chapter markers');
await aiOrchestrator.executeCommand('video-123', 'make it 90 seconds long');

// Direct method calls
const fillerResult = await aiOrchestrator.removeFillerWords('video-123');
console.log(`Found ${fillerResult.data?.fillerCount} filler words`);

const highlightResult = await aiOrchestrator.generateHighlights('video-123', 'humor');
console.log(`Generated ${highlightResult.data?.highlights.length} highlights`);

const chapterResult = await aiOrchestrator.generateChapters('video-123');
console.log(`Created ${chapterResult.data?.chapters.length} chapters`);
*/

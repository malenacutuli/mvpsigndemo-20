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
   * Remove filler words (um, uh, like, you know) from video transcript
   * 
   * @param videoId - Video to analyze
   * @param projectId - Optional project ID
   * @returns APIResponse with detected filler words
   * 
   * @example
   * const result = await removeFillerWords('video-123');
   * console.log(`Found ${result.data.fillerCount} filler words`);
   */
  async removeFillerWords(videoId: string, projectId?: string): Promise<APIResponse<{ fillerCount: number; fillers: FillerWord[] }>> {
    try {
      console.log('[AI Orchestrator] Starting filler word removal for video:', videoId);
      
      // Load transcript
      const segments = await this.loadTranscript(videoId);
      if (!segments || segments.length === 0) {
        throw new Error('No transcript found for video');
      }
      
      console.log(`[AI Orchestrator] Loaded ${segments.length} transcript segments`);
      
      // Format transcript for AI
      const transcriptText = this.formatTranscriptForAI(segments);
      
      // Analyze with AI
      const model = getModel();
      const prompt = `Analyze this video transcript and identify ALL filler words (um, uh, like, you know, so, basically, actually, etc.).

Transcript:
${transcriptText}

Return ONLY valid JSON (no markdown) with this structure:
{
  "fillers": [
    {
      "startTime": 12.5,
      "endTime": 12.8,
      "text": "um",
      "reason": "Filler word that interrupts speech flow",
      "confidence": 0.95
    }
  ]
}

Be thorough - include ALL filler words found.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = this.parseAIResponse<{ fillers: Array<{ startTime: number; endTime: number; text: string; reason: string; confidence: number }> }>(responseText);
      
      console.log(`[AI Orchestrator] AI found ${parsed.fillers.length} filler words`);
      
      // Create suggestions in database
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
          action_parameters: { text: filler.text }
        });
      }
      
      console.log('[AI Orchestrator] Created suggestions in database');
      
      return {
        success: true,
        data: {
          fillerCount: parsed.fillers.length,
          fillers: parsed.fillers.map((f, i) => ({
            segmentId: `filler-${i}`,
            startTime: f.startTime,
            endTime: f.endTime,
            text: f.text,
            reason: f.reason,
            confidence: f.confidence
          }))
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
   * Generate highlight clips based on criteria
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
  ): Promise<APIResponse<{ highlights: Highlight[] }>> {
    try {
      console.log('[AI Orchestrator] Generating highlights with criteria:', criteria);
      
      const segments = await this.loadTranscript(videoId);
      if (!segments || segments.length === 0) {
        throw new Error('No transcript found for video');
      }
      
      const transcriptText = this.formatTranscriptForAI(segments);
      
      const model = getModel();
      const criteriaPrompts = {
        humor: 'funny moments, jokes, or amusing situations',
        insights: 'key insights, important information, or valuable takeaways',
        action: 'exciting or dynamic moments with energy and movement',
        'key-points': 'most important and valuable content'
      };
      
      const prompt = `Analyze this video transcript and identify 3-5 highlight-worthy moments focused on: ${criteriaPrompts[criteria]}.

Transcript:
${transcriptText}

Return ONLY valid JSON (no markdown) with this structure:
{
  "highlights": [
    {
      "startTime": 45.0,
      "endTime": 67.5,
      "score": 0.92,
      "title": "Key insight about topic",
      "reason": "This section contains valuable information because..."
    }
  ]
}

Each highlight should be 15-45 seconds long and highly engaging.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = this.parseAIResponse<{ highlights: Highlight[] }>(responseText);
      
      console.log(`[AI Orchestrator] Generated ${parsed.highlights.length} highlights`);
      
      // Create suggestions in database
      for (const highlight of parsed.highlights) {
        await this.createSuggestion({
          video_id: videoId,
          project_id: projectId,
          suggestion_type: 'highlight',
          start_time: highlight.startTime,
          end_time: highlight.endTime,
          confidence: highlight.score,
          reason: highlight.reason,
          suggested_action: 'create_highlight',
          action_parameters: { title: highlight.title, criteria }
        });
      }
      
      return {
        success: true,
        data: { highlights: parsed.highlights }
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
  async generateChapters(videoId: string, projectId?: string): Promise<APIResponse<{ chapters: Chapter[] }>> {
    try {
      console.log('[AI Orchestrator] Generating chapters for video:', videoId);
      
      const segments = await this.loadTranscript(videoId);
      if (!segments || segments.length === 0) {
        throw new Error('No transcript found for video');
      }
      
      const transcriptText = this.formatTranscriptForAI(segments);
      
      const model = getModel();
      const prompt = `Analyze this video transcript and create chapter markers for natural topic breaks.

Transcript:
${transcriptText}

Return ONLY valid JSON (no markdown) with this structure:
{
  "chapters": [
    {
      "startTime": 0.0,
      "title": "Introduction",
      "description": "Overview of the topic"
    },
    {
      "startTime": 45.0,
      "title": "Main Topic",
      "description": "Deep dive into core concepts"
    }
  ]
}

Create 3-7 chapters based on natural topic transitions.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = this.parseAIResponse<{ chapters: Chapter[] }>(responseText);
      
      console.log(`[AI Orchestrator] Generated ${parsed.chapters.length} chapters`);
      
      // Create suggestions in database
      for (const chapter of parsed.chapters) {
        await this.createSuggestion({
          video_id: videoId,
          project_id: projectId,
          suggestion_type: 'chapter',
          start_time: chapter.startTime,
          end_time: chapter.startTime, // Chapters are markers, not ranges
          confidence: 0.9,
          reason: chapter.description,
          suggested_action: 'add_chapter',
          action_parameters: { title: chapter.title, description: chapter.description }
        });
      }
      
      return {
        success: true,
        data: { chapters: parsed.chapters }
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
   * Shorten video to target duration by removing less important sections
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
  ): Promise<APIResponse<{ segmentsToRemove: SegmentToRemove[]; currentDuration: number; reduction: number }>> {
    try {
      console.log(`[AI Orchestrator] Shortening video to ${targetDuration} seconds`);
      
      // Get video duration
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .select('duration_seconds')
        .eq('id', videoId)
        .single();
      
      if (videoError) throw videoError;
      if (!video) throw new Error('Video not found');
      
      const currentDuration = video.duration_seconds || 0;
      const reduction = currentDuration - targetDuration;
      
      if (reduction <= 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_TARGET',
            message: 'Target duration must be shorter than current duration'
          }
        };
      }
      
      const segments = await this.loadTranscript(videoId);
      if (!segments || segments.length === 0) {
        throw new Error('No transcript found for video');
      }
      
      const transcriptText = this.formatTranscriptForAI(segments);
      
      const model = getModel();
      const prompt = `Analyze this ${currentDuration}s video and suggest which segments to remove to reach ${targetDuration}s (remove ${reduction}s total).

Prioritize removing:
- Pauses and silence
- Repetitive content
- Tangents
- Less important information

Transcript:
${transcriptText}

Return ONLY valid JSON (no markdown) with this structure:
{
  "segmentsToRemove": [
    {
      "startTime": 23.5,
      "endTime": 31.2,
      "duration": 7.7,
      "reason": "Repetitive explanation already covered"
    }
  ]
}

Total removed duration should equal approximately ${reduction}s.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = this.parseAIResponse<{ segmentsToRemove: Array<{ startTime: number; endTime: number; duration: number; reason: string }> }>(responseText);
      
      console.log(`[AI Orchestrator] Suggested ${parsed.segmentsToRemove.length} segments for removal`);
      
      // Create suggestions
      for (const segment of parsed.segmentsToRemove) {
        await this.createSuggestion({
          video_id: videoId,
          project_id: projectId,
          suggestion_type: 'silent-gap',
          start_time: segment.startTime,
          end_time: segment.endTime,
          confidence: 0.85,
          reason: segment.reason,
          suggested_action: 'remove',
          action_parameters: { duration: segment.duration }
        });
      }
      
      return {
        success: true,
        data: {
          segmentsToRemove: parsed.segmentsToRemove.map((s, i) => ({
            segmentId: `remove-${i}`,
            startTime: s.startTime,
            endTime: s.endTime,
            duration: s.duration,
            reason: s.reason
          })),
          currentDuration,
          reduction
        }
      };
      
    } catch (error: any) {
      console.error('[AI Orchestrator] shortenToDuration error:', error);
      return {
        success: false,
        error: {
          code: 'SHORTEN_TO_DURATION_FAILED',
          message: error.message || 'Failed to shorten video',
          details: error
        }
      };
    }
  }

  /**
   * Detect retakes and repeated phrases in the video
   * 
   * @param videoId - Video to analyze
   * @param projectId - Optional project ID
   * @returns APIResponse with detected retakes
   * 
   * @example
   * const result = await detectRetakes('video-123');
   */
  async detectRetakes(videoId: string, projectId?: string): Promise<APIResponse<{ retakes: any[] }>> {
    try {
      console.log('[AI Orchestrator] Detecting retakes for video:', videoId);
      
      const segments = await this.loadTranscript(videoId);
      if (!segments || segments.length === 0) {
        throw new Error('No transcript found for video');
      }
      
      const transcriptText = this.formatTranscriptForAI(segments);
      
      const model = getModel();
      const prompt = `Analyze this transcript and identify false starts, repeated takes, and do-overs where the speaker restarts.

Transcript:
${transcriptText}

Return ONLY valid JSON (no markdown) with this structure:
{
  "retakes": [
    {
      "startTime": 12.5,
      "endTime": 18.3,
      "originalAttempt": "Let me start that again...",
      "reason": "Speaker restarted explanation",
      "confidence": 0.88
    }
  ]
}

Look for phrases like "let me try that again", "actually", or repeated similar sentences.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = this.parseAIResponse<{ retakes: any[] }>(responseText);
      
      console.log(`[AI Orchestrator] Detected ${parsed.retakes.length} retakes`);
      
      // Create suggestions
      for (const retake of parsed.retakes) {
        await this.createSuggestion({
          video_id: videoId,
          project_id: projectId,
          suggestion_type: 'retake',
          start_time: retake.startTime,
          end_time: retake.endTime,
          confidence: retake.confidence || 0.8,
          reason: retake.reason,
          suggested_action: 'remove',
          action_parameters: { originalAttempt: retake.originalAttempt }
        });
      }
      
      return {
        success: true,
        data: { retakes: parsed.retakes }
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
   * Suggest transitions between scenes based on content flow
   * 
   * @param videoId - Video to analyze
   * @param projectId - Optional project ID
   * @returns APIResponse with transition suggestions
   * 
   * @example
   * const result = await suggestTransitions('video-123', 'project-456');
   */
  async suggestTransitions(videoId: string, projectId?: string): Promise<APIResponse<{ transitions: any[] }>> {
    try {
      console.log('[AI Orchestrator] Suggesting transitions for video:', videoId);
      
      const segments = await this.loadTranscript(videoId);
      if (!segments || segments.length === 0) {
        throw new Error('No transcript found for video');
      }
      
      const transcriptText = this.formatTranscriptForAI(segments);
      
      const model = getModel();
      const prompt = `Analyze this transcript and suggest where transitions would improve the flow.

Transcript:
${transcriptText}

Suggest transitions for:
- Topic changes
- Speaker changes
- Tone shifts
- Scene changes

Return ONLY valid JSON (no markdown) with this structure:
{
  "transitions": [
    {
      "time": 45.2,
      "transitionType": "fade",
      "reason": "Topic change from intro to main content",
      "confidence": 0.9
    }
  ]
}

Types: fade, crossfade, cut, wipe, slide`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = this.parseAIResponse<{ transitions: any[] }>(responseText);
      
      console.log(`[AI Orchestrator] Suggested ${parsed.transitions.length} transitions`);
      
      // Create suggestions
      for (const transition of parsed.transitions) {
        await this.createSuggestion({
          video_id: videoId,
          project_id: projectId,
          suggestion_type: 'transition',
          start_time: transition.time,
          end_time: transition.time,
          confidence: transition.confidence || 0.85,
          reason: transition.reason,
          suggested_action: 'add_transition',
          action_parameters: { transitionType: transition.transitionType }
        });
      }
      
      return {
        success: true,
        data: { transitions: parsed.transitions }
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

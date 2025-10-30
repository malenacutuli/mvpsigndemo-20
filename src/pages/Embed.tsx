import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { EmbedPlayer } from '@/components/EmbedPlayer';
import type { CaptionSegment } from '@/components/CaptionsWithIntention';

interface Video {
  id: string;
  title: string;
  description: string | null;
  language: string;
  content_type: string;
  storage_path: string | null;
  thumbnail_url: string | null;
  embed_enabled: boolean;
  embed_domains: string[] | null;
  embed_token: string | null;
  embed_settings: any;
  metadata?: any | null;
}

const Embed = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [video, setVideo] = useState<Video | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const [audioDescriptions, setAudioDescriptions] = useState<any[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<{ id: string; name: string; description: string } | undefined>(undefined);

  const embedToken = searchParams.get('token');

  useEffect(() => {
    if (id) {
      validateAndLoadVideo();
    }
  }, [id, embedToken]);

  const validateAndLoadVideo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get referrer domain for validation
      const referrerDomain = document.referrer ? new URL(document.referrer).hostname : null;

      // First, validate embed access
      const { data: validationResult, error: validationError } = await supabase
        .rpc('validate_embed_access', {
          video_uuid: id,
          token: embedToken,
          referrer_domain: referrerDomain
        });

      if (validationError) {
        console.error('Validation error:', validationError);
        setError('Access denied: Invalid embed configuration');
        return;
      }

      if (!validationResult) {
        setError('Access denied: This video is not available for embedding');
        return;
      }

      // If validation passes, load the video
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single();

      if (videoError || !videoData) {
        setError('Video not found');
        return;
      }

      if (!videoData.embed_enabled) {
        setError('Embedding is not enabled for this video');
        return;
      }

      setVideo(videoData);
      const meta = (videoData as any)?.metadata;
      if (meta?.ad_voice_id && meta?.ad_voice_name) {
        setSelectedVoice({ id: meta.ad_voice_id, name: meta.ad_voice_name, description: 'Preferred AD voice' });
      }

      // Get video URL
      if (videoData.storage_path) {
        const { data: publicUrl } = supabase.storage
          .from('videos')
          .getPublicUrl(videoData.storage_path);

        if (publicUrl?.publicUrl) {
          setVideoUrl(publicUrl.publicUrl);
        }
      }

      // Load captions
      await loadCaptions(videoData.id, videoData.language);
      // Load audio descriptions
      await loadAudioDescriptions(videoData.id, videoData.language);

    } catch (error) {
      console.error('Error loading embed video:', error);
      setError('Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const loadCaptions = async (videoId: string, lang: string) => {
    try {
      // Prefer the latest edited transcript for the given language
      const { data: transcripts, error: txError } = await supabase
        .from('transcripts')
        .select('id, updated_at')
        .eq('video_id', videoId)
        .eq('language', lang)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (txError) {
        console.error('Error loading transcripts:', txError);
      }

      let segments: any[] | null = null;

      if (transcripts && transcripts.length > 0) {
        const transcriptId = transcripts[0].id;
        const { data: segs, error: segErr } = await supabase
          .from('transcript_segments_clean')
          .select('*')
          .eq('transcript_id', transcriptId)
          .order('idx', { ascending: true })
          .order('start_time', { ascending: true });
        if (segErr) {
          console.error('Error loading edited transcript segments:', segErr);
        } else {
          segments = segs || [];
        }
      } else {
        // Fallback to base video-level segments for the language
        const { data: segs, error: segErr } = await supabase
          .from('transcript_segments_clean')
          .select('*')
          .eq('video_id', videoId)
          .eq('language', lang)
          .is('transcript_id', null)
          .order('start_time', { ascending: true });
        if (segErr) {
          console.error('Error loading base transcript segments:', segErr);
        } else {
          segments = segs || [];
        }
      }

      if (segments && segments.length > 0) {
        const captionSegments: CaptionSegment[] = segments.map(segment => {
          const words: any[] = Array.isArray(segment.words) && segment.words.length > 0
            ? segment.words
            : String(segment.text || '')
                .split(' ')
                .map((word: string, index: number, arr: string[]) => {
                  const duration = Number(segment.end_time) - Number(segment.start_time);
                  const wordDuration = duration / Math.max(arr.length, 1);
                  return {
                    text: word,
                    startTime: Number(segment.start_time) + (index * wordDuration),
                    endTime: Number(segment.start_time) + ((index + 1) * wordDuration),
                    emphasis: 'normal' as const,
                    pitch: 'normal' as const,
                  };
                });

          return {
            text: segment.text,
            speaker: (segment.speaker || 'narrator') as any,
            startTime: Number(segment.start_time),
            endTime: Number(segment.end_time),
            words,
            speakerColor: segment.speaker_color || '#3B82F6',
          };
        });

        setCaptions(captionSegments);
      }
    } catch (error) {
      console.error('Error loading captions:', error);
    }
  };

  const loadAudioDescriptions = async (videoId: string, lang: string) => {
    try {
      const { data, error } = await supabase
        .from('audio_descriptions')
        .select('*')
        .eq('video_id', videoId)
        .eq('language', lang)
        .order('updated_at', { ascending: false })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error loading audio descriptions:', error);
        return;
      }

      if (data && data.length > 0) {
        const latestByWindow = new Map<string, any>();
        for (const row of data) {
          const key = `${Number(row.start_time).toFixed(2)}-${Number(row.end_time).toFixed(2)}`;
          if (!latestByWindow.has(key)) latestByWindow.set(key, row);
        }
        const deduped = Array.from(latestByWindow.values()).sort((a, b) => Number(a.start_time) - Number(b.start_time));
        const formatted = deduped.map(d => ({
          text: d.description,
          startTime: Number(d.start_time),
          endTime: Number(d.end_time),
          voiceStyle: 'warm' as const,
          timestamp: Number(d.start_time)
        }));
        setAudioDescriptions(formatted);
      }
    } catch (e) {
      console.error('Error loading audio descriptions:', e);
    }
  };

  // Set iframe-friendly styling
  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.backgroundColor = '#000';
    document.documentElement.style.height = '100%';
    document.body.style.height = '100%';

    return () => {
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.backgroundColor = '';
      document.documentElement.style.height = '';
      document.body.style.height = '';
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
          <p>Loading video...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center p-8">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold mb-2">Access Denied</h1>
          <p className="text-white/70">{error}</p>
        </div>
      </div>
    );
  }

  if (!video || !videoUrl) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center p-8">
          <div className="text-white/50 text-4xl mb-4">📹</div>
          <h1 className="text-xl font-semibold mb-2">Video Unavailable</h1>
          <p className="text-white/70">This video cannot be played at this time</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black">
      <EmbedPlayer
        videoSrc={videoUrl}
        posterSrc={video.thumbnail_url || undefined}
        title={video.title}
        videoId={video.id}
        embedToken={embedToken || undefined}
        captions={captions}
        audioDescriptions={audioDescriptions}
        characters={characters}
        contentType={video.content_type === 'recipe' ? 'recipe' : 'education'}
        selectedVoice={selectedVoice}
        settings={video.embed_settings || {}}
      />
    </div>
  );
};

export default Embed;
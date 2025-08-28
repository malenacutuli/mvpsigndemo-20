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
      await loadCaptions(videoData.id);

    } catch (error) {
      console.error('Error loading embed video:', error);
      setError('Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const loadCaptions = async (videoId: string) => {
    try {
      const { data: segments, error } = await supabase
        .from('transcript_segments')
        .select('*')
        .eq('video_id', videoId)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error loading captions:', error);
        return;
      }

      if (segments && segments.length > 0) {
        const captionSegments: CaptionSegment[] = segments.map(segment => {
          const words = segment.text.split(' ').map((word, index, arr) => {
            const duration = segment.end_time - segment.start_time;
            const wordDuration = duration / arr.length;
            return {
              text: word,
              startTime: segment.start_time + (index * wordDuration),
              endTime: segment.start_time + ((index + 1) * wordDuration),
              emphasis: 'normal' as const,
              pitch: 'normal' as const,
            };
          });

          return {
            text: segment.text,
            speaker: (segment.speaker || 'narrator') as any,
            startTime: segment.start_time,
            endTime: segment.end_time,
            words,
          };
        });

        setCaptions(captionSegments);
      }
    } catch (error) {
      console.error('Error loading captions:', error);
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
        settings={video.embed_settings || {}}
      />
    </div>
  );
};

export default Embed;
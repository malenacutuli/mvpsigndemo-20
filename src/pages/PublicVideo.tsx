import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, Globe, Languages, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AxessiblePlayer } from "@/components/AxessiblePlayer";
import type { CaptionSegment } from "@/components/CaptionsWithIntention";

interface PublicVideo {
  id: string;
  title: string;
  description: string | null;
  language: string;
  content_type: string;
  storage_path: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  view_count: number;
  published_at: string;
  created_at: string;
  metadata?: any | null;
}

const PublicVideo = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [video, setVideo] = useState<PublicVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const [audioDescriptions, setAudioDescriptions] = useState<any[]>([]);
  const [viewTracked, setViewTracked] = useState(false);

  const selectedVoicePreference = useMemo(() => {
    const meta = (video as any)?.metadata;
    if (meta?.ad_voice_id && meta?.ad_voice_name) {
      return { id: meta.ad_voice_id, name: meta.ad_voice_name, description: 'Preferred AD voice' } as const;
    }
    return undefined;
  }, [video]);

  useEffect(() => {
    if (id) {
      fetchVideo();
    }
  }, [id]);

  const trackView = async () => {
    if (!id || viewTracked) return;

    try {
      // Track the view
      await supabase.rpc('increment_video_views', { video_uuid: id });

      // Add detailed view tracking
      const { error } = await supabase
        .from('public_video_views')
        .insert({
          video_id: id,
          viewer_ip: null, // Could be added with server-side tracking
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
          session_id: Math.random().toString(36).substring(7)
        });

      if (error) {
        console.warn('View tracking error:', error);
      }

      setViewTracked(true);
    } catch (error) {
      console.warn('Error tracking view:', error);
    }
  };

  const fetchVideo = async () => {
    try {
      // Fetch public video details
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .eq('is_public', true)
        .in('status', ['ready', 'uploaded'])
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.error('Video not found or not public');
          navigate('/public');
          return;
        }
        throw error;
      }

      setVideo(data);

      // Get video URL
      if (data.storage_path) {
        const { data: { publicUrl } } = supabase.storage
          .from('videos')
          .getPublicUrl(data.storage_path);
        
        setVideoUrl(publicUrl);
      }

      // Fetch transcript segments with edited transcript priority
      console.log('🔍 Fetching transcript segments for public video:', id);
      
      let segments: any[] | null = null;
      
      // First, look for the most recent edited transcript for this video/language
      const { data: transcripts, error: txError } = await supabase
        .from('transcripts')
        .select('id, updated_at')
        .eq('video_id', id)
        .eq('language', data.language || 'en')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (txError) {
        console.error('❌ Error fetching transcripts:', txError);
      }

      if (transcripts && transcripts.length > 0) {
        // Use ONLY the edited transcript's segments
        const transcriptId = transcripts[0].id;
        const { data: segs, error: segErr } = await supabase
          .from('transcript_segments')
          .select('*')
          .eq('transcript_id', transcriptId)
          .order('idx', { ascending: true })
          .order('start_time', { ascending: true });

        if (segErr) {
          console.error('❌ Error fetching edited transcript segments:', segErr);
        } else {
          segments = segs || [];
          console.log('🎯 Using edited transcript segments by transcript_id:', transcriptId, 'count:', segments.length);
        }
      } else {
        // No edited transcript found; fall back to base video-level segments only
        const { data: segs, error: segErr } = await supabase
          .from('transcript_segments')
          .select('*')
          .eq('video_id', id)
          .eq('language', data.language || 'en')
          .is('transcript_id', null)
          .order('start_time', { ascending: true });

        if (segErr) {
          console.error('❌ Error fetching base transcript segments:', segErr);
        } else {
          segments = segs || [];
          console.log('🗄️ Using base video-level transcript segments (no edited transcript found). Count:', segments.length);
        }
      }

      console.log('✅ Successfully fetched transcript segments with source priority:', segments?.length || 0, 'segments');

      if (segments && segments.length > 0) {
        const formattedCaptions: CaptionSegment[] = segments.map(segment => ({
          text: segment.text,
          speaker: segment.speaker || 'Speaker',
          startTime: segment.start_time,
          endTime: segment.end_time,
          words: Array.isArray(segment.words) 
            ? segment.words.filter((word): word is any => 
                typeof word === 'object' && 
                word !== null && 
                'text' in word && 
                'startTime' in word && 
                'endTime' in word
              )
            : [],
          speakerColor: segment.speaker_color || '#3B82F6',
          isOffCamera: segment.is_off_camera || false
        }));
        setCaptions(formattedCaptions);
        console.log('✅ Captions set successfully:', formattedCaptions.length, 'formatted captions');
      } else {
        console.log('⚠️ No transcript segments found for video:', id);
      }

      // Fetch audio descriptions (accessible for public videos via RLS)
      console.log('🔍 Fetching audio descriptions for public video:', id);
      const { data: audioDesc, error: audioDescError } = await supabase
        .from('audio_descriptions')
        .select('*')
        .eq('video_id', id)
        .eq('language', data.language)
        .order('updated_at', { ascending: false })
        .order('start_time', { ascending: true });

      if (audioDescError) {
        console.error('❌ Error fetching audio descriptions:', audioDescError);
      } else {
        console.log('✅ Successfully fetched audio descriptions:', audioDesc?.length || 0, 'descriptions');
      }

      if (audioDesc && audioDesc.length > 0) {
        // Keep only the latest description per time window based on updated_at
        const latestByWindow = new Map<string, any>();
        for (const row of audioDesc) {
          const key = `${Number(row.start_time).toFixed(2)}-${Number(row.end_time).toFixed(2)}`;
          if (!latestByWindow.has(key)) {
            latestByWindow.set(key, row);
          }
        }
        const deduped = Array.from(latestByWindow.values()).sort((a, b) => Number(a.start_time) - Number(b.start_time));

        // Map DB rows to player format expected by AudioDescription component
        const formatted = deduped.map(d => ({
          text: d.description,
          startTime: Number(d.start_time),
          endTime: Number(d.end_time),
          voiceStyle: 'warm' as const,
          timestamp: Number(d.start_time),
        }));
        setAudioDescriptions(formatted);
        console.log('✅ Audio descriptions set (deduped to latest):', formatted.length, 'descriptions');
      } else {
        console.log('⚠️ No audio descriptions found for video:', id);
      }

      // Fetch tracks (subtitle files) - now accessible for public videos via RLS
      console.log('🔍 Fetching tracks for public video:', id);
      const { data: tracks, error: tracksError } = await supabase
        .from('tracks')
        .select('*')
        .eq('video_id', id)
        .order('language', { ascending: true });

      if (tracksError) {
        console.error('❌ Error fetching tracks:', tracksError);
      } else {
        console.log('✅ Successfully fetched tracks:', tracks?.length || 0, 'tracks');
        if (tracks && tracks.length > 0) {
          console.log('📝 Available tracks:', tracks.map(t => `${t.language} (${t.kind})`).join(', '));
        }
      }

      // Track view after successful load
      setTimeout(trackView, 2000); // Delay to ensure meaningful view

    } catch (error) {
      console.error('Error fetching video:', error);
      navigate('/public');
    } finally {
      setLoading(false);
    }
  };

  const formatViewCount = (count: number) => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  };

  const getLanguageDisplay = (lang: string) => {
    const languages: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French', 
      'de': 'German'
    };
    return languages[lang] || lang;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Skeleton className="h-10 w-32 mb-4" />
            <Skeleton className="h-8 w-96 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="aspect-video w-full mb-6" />
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Skeleton className="h-32 w-full" />
            </div>
            <div>
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Video Not Found</h2>
            <p className="text-muted-foreground mb-6">
              This video may not be public or may have been removed.
            </p>
            <Button onClick={() => navigate('/public')}>
              Back to Public Board
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/public')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Public Board
        </Button>

        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{video.title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {formatViewCount(video.view_count)} views
                </div>
                <div className="flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  Public
                </div>
                <div className="flex items-center gap-1">
                  <Languages className="w-4 h-4" />
                  {getLanguageDisplay(video.language)}
                </div>
                {video.duration_seconds && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDuration(video.duration_seconds)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Video Player */}
        <div className="mb-8">
          {videoUrl && (
            <AxessiblePlayer
              videoSrc={videoUrl}
              posterSrc={video.thumbnail_url || undefined}
              title={video.title}
              videoId={video.id}
              selectedVoice={selectedVoicePreference}
              selectedASLAvatar={undefined}
              contentType={video.content_type as 'recipe' | 'education'}
              initialCaptions={captions}
              dynamicDescriptions={audioDescriptions}
              isPublic={true}
            />
          )}
        </div>

        {/* Description Below Video */}
        {video.description && (
          <Card className="mb-8">
            <CardContent className="pt-4">
              <p className="text-muted-foreground whitespace-pre-wrap">
                {video.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Immersive Features Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              {t('videoDetail.immersiveFeatures')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-primary font-bold text-sm">CC</span>
                </div>
                <h3 className="font-semibold mb-1">Captions with Intention</h3>
                <p className="text-sm text-muted-foreground">
                  Emotional context and speaker identification
                </p>
              </div>
              
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-green-600 font-bold text-sm">AD</span>
                </div>
                <h3 className="font-semibold mb-1">Audio Descriptions</h3>
                <p className="text-sm text-muted-foreground">
                  Describes visual elements for screen readers
                </p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground">
                {t('videoDetail.immersiveTip')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicVideo;
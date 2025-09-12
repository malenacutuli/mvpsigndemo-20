import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
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
}

const PublicVideo = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<PublicVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const [audioDescriptions, setAudioDescriptions] = useState<any[]>([]);
  const [viewTracked, setViewTracked] = useState(false);

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

      // Fetch transcript segments (these are already accessible for public videos via RLS)
      const { data: segments } = await supabase
        .from('transcript_segments')
        .select('*')
        .eq('video_id', id)
        .order('start_time', { ascending: true });

      if (segments) {
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
      }

      // Fetch audio descriptions (need to update RLS policy to allow public access)
      const { data: audioDesc } = await supabase
        .from('audio_descriptions')
        .select('*')
        .eq('video_id', id)
        .order('start_time', { ascending: true });

      if (audioDesc) {
        setAudioDescriptions(audioDesc);
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

        {/* Video Header */}
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
          
          {video.description && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {video.description}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Video Player */}
        <div className="mb-8">
          {videoUrl && (
            <AxessiblePlayer
              videoSrc={videoUrl}
              posterSrc={video.thumbnail_url || undefined}
              title={video.title}
              videoId={video.id}
              selectedVoice={undefined}
              selectedASLAvatar={undefined}
              contentType={video.content_type as 'recipe' | 'education'}
              initialCaptions={captions}
              dynamicDescriptions={audioDescriptions}
            />
          )}
        </div>

        {/* Accessibility Features Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Accessibility Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
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
              
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-blue-600 font-bold text-sm">ASL</span>
                </div>
                <h3 className="font-semibold mb-1">ASL Interpretation</h3>
                <p className="text-sm text-muted-foreground">
                  American Sign Language video overlay
                </p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground">
                <strong>Tip:</strong> Use the accessibility controls in the video player to toggle captions, 
                audio descriptions, and ASL interpretation based on your needs.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicVideo;
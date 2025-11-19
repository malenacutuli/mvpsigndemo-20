import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Navigation } from '@/components/Navigation';
import { EnhancedVideoPlayer } from '@/components/EnhancedVideoPlayer';
import { AccessibleVideoExporter } from '@/components/AccessibleVideoExporter';
import { RightSidebarFixed } from '@/components/RightSidebarFixed';
import { supabase } from '@/integrations/supabase/client';
import { getPublicUrl } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import type { CaptionSegment } from '@/components/CaptionsWithIntention';

interface Video {
  id: string;
  title: string;
  description: string | null;
  language: string;
  content_type: string;
  status: string;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
}

export default function VideoDetailWorkflow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [audioDescriptions, setAudioDescriptions] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchVideo(id);
      loadExistingCaptions(id);
    }
    getCurrentUser();
  }, [id]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const loadExistingCaptions = async (videoId: string) => {
    try {
      const { data, error } = await supabase
        .from('transcript_segments_clean')
        .select('*')
        .eq('video_id', videoId)
        .order('start_time', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const captionSegments: CaptionSegment[] = data.map((seg, index) => ({
          text: seg.text,
          speaker: seg.speaker || `Speaker ${(index % 3) + 1}`,
          startTime: Number(seg.start_time),
          endTime: Number(seg.end_time),
          words: seg.text.split(' ').map((word, i) => ({
            text: word,
            startTime: Number(seg.start_time) + (i * (Number(seg.end_time) - Number(seg.start_time)) / seg.text.split(' ').length),
            endTime: Number(seg.start_time) + ((i + 1) * (Number(seg.end_time) - Number(seg.start_time)) / seg.text.split(' ').length),
            emphasis: (seg.emphasis as 'normal' | 'loud' | 'quiet' | 'yelling') || 'normal', // Load saved emphasis with proper typing
            pitch: (seg.pitch as 'normal' | 'high' | 'low') || 'normal', // Load saved pitch with proper typing
          })),
          volume: seg.emphasis === 'loud' ? 80 : seg.emphasis === 'yelling' ? 100 : seg.emphasis === 'quiet' ? 30 : 50,
          pitch: seg.pitch === 'high' ? 200 : seg.pitch === 'low' ? 120 : 160,
          type: 'dialogue',
          isOffCamera: seg.is_off_camera || false,
          speakerColor: seg.speaker_color || getSpeakerColor(seg.speaker || `Speaker ${(index % 3) + 1}`), // Load saved speaker color
        }));
        setCaptions(captionSegments);
        // Keep workflow visible so users can always edit transcript and manage characters
        console.log('✅ Loaded existing captions for video player:', captionSegments.length, 'segments');
      }
    } catch (error) {
      console.error('Error loading existing captions:', error);
    }
  };

  // Use unified color palette from cwiPalette
  const getSpeakerColor = (speakerName: string) => {
    const { getSpeakerColor: getColor } = require('@/lib/cwiPalette');
    return getColor(speakerName);
  };

  const fetchVideo = async (videoId: string) => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        console.log('Video not found');
        return;
      }
      
      setVideo(data);
      
      if (data.storage_path) {
        const publicUrl = getPublicUrl('videos', data.storage_path);
        setVideoUrl(publicUrl);
      }

    } catch (error) {
      console.error('Error fetching video:', error);
      toast({
        title: "Error loading video",
        description: "Could not load video details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTranscriptReady = (segments: CaptionSegment[]) => {
    setCaptions(segments);
    console.log('✅ Transcript updated:', segments.length, 'segments');
    toast({
      title: "Transcript ready!",
      description: "Your video is now ready with full accessibility features"
    });
  };

  const handleCharactersUpdate = (updatedCharacters: any[]) => {
    setCharacters(updatedCharacters);
    console.log('✅ Characters updated:', updatedCharacters.length, 'characters');
    
    // Apply character updates to existing captions and refresh player
    if (captions.length > 0) {
      const refreshedCaptions = captions.map(caption => {
        const character = updatedCharacters.find(char => char.name === caption.speaker);
        if (character) {
          return {
            ...caption,
            speakerColor: character.color,
            volume: character.emphasis === 'loud' ? 80 : character.emphasis === 'quiet' ? 30 : 50,
            pitch: character.pitch === 'high' ? 200 : character.pitch === 'low' ? 120 : 160,
            words: caption.words?.map(word => ({
              ...word,
              emphasis: character.emphasis || word.emphasis,
              pitch: character.pitch || word.pitch,
            })) || []
          };
        }
        return caption;
      });
      setCaptions(refreshedCaptions);
      console.log('🔄 Captions refreshed with character updates');
    }
  };

  const handleAudioDescriptionsUpdate = (updatedDescriptions: any[]) => {
    setAudioDescriptions(updatedDescriptions);
    console.log('✅ Audio descriptions updated:', updatedDescriptions.length, 'descriptions');
  };

  const handleWorkflowComplete = () => {
    // Workflow completion is now handled internally by TranscriptWorkflow
    console.log('Workflow completed');
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800'; 
      case 'uploading': return 'bg-blue-100 text-blue-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-64 w-full" />
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
            <h1 className="text-2xl font-bold mb-4">Video Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The video you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/videos')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Videos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header - fixed height */}
      <header className="h-16 border-b border-border flex-shrink-0">
        <Navigation />
      </header>
      
      {/* Sub-header with video info */}
      <div className="h-20 border-b border-border flex-shrink-0 px-4 flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/videos')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <div className="flex-1">
          <h1 className="text-xl font-bold">{video.title}</h1>
          <div className="flex items-center gap-4 mt-1">
            <Badge className={getStatusColor(video.status)}>
              {video.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {getLanguageDisplay(video.language)}
            </span>
            {video.duration_seconds && (
              <span className="text-sm text-muted-foreground">
                {formatDuration(video.duration_seconds)}
              </span>
            )}
          </div>
        </div>

        {videoUrl && userId && (
          <AccessibleVideoExporter
            videoId={video.id}
            videoUrl={videoUrl}
          />
        )}
      </div>
      
      {/* Main content area - fills remaining space */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Video Player */}
        <div className="w-2/3 flex flex-col overflow-hidden">
          <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
            {videoUrl && (
              <EnhancedVideoPlayer
                videoSrc={videoUrl}
                posterSrc={video.thumbnail_url || undefined}
                title={video.title}
                videoId={video.id}
                language={video.language}
                contentType={video.content_type as 'recipe' | 'education'}
                onTranscriptUpdate={handleTranscriptReady}
                className="w-full h-full"
              />
            )}
          </div>
        </div>
        
        {/* Right: Sidebar - Fixed with scrollable content */}
        <div className="w-1/3 flex flex-col overflow-hidden border-l border-border">
          <RightSidebarFixed 
            videoId={video.id}
            videoUrl={videoUrl}
            onTranscriptUpdate={handleTranscriptReady}
            onCharactersUpdate={handleCharactersUpdate}
            onAudioDescriptionsUpdate={handleAudioDescriptionsUpdate}
          />
        </div>
      </div>
    </div>
  );
}
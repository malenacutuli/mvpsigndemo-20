import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Navigation } from '@/components/Navigation';
import { TranscriptWorkflow } from '@/components/TranscriptWorkflow';
import { CleanAxessiblePlayer } from '@/components/CleanAxessiblePlayer';
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
  const [showWorkflow, setShowWorkflow] = useState(true);

  useEffect(() => {
    if (id) {
      fetchVideo(id);
      loadExistingCaptions(id);
    }
  }, [id]);

  const loadExistingCaptions = async (videoId: string) => {
    try {
      const { data, error } = await supabase
        .from('transcript_segments')
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
            emphasis: 'normal',
            pitch: 'normal',
          })),
          volume: 50,
          pitch: 160,
          type: 'dialogue',
          isOffCamera: false,
          speakerColor: getSpeakerColor(index),
        }));
        setCaptions(captionSegments);
        setShowWorkflow(false); // Auto-proceed to player if captions exist
        console.log('✅ Loaded existing captions for video player:', captionSegments.length, 'segments');
      }
    } catch (error) {
      console.error('Error loading existing captions:', error);
    }
  };

  const getSpeakerColor = (index: number) => {
    const colors = ['#E5E517', '#17E5E5', '#E51717', '#E58017', '#17E517', '#E517E5'];
    return colors[index % colors.length];
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
    toast({
      title: "Transcript ready!",
      description: "Your video is now ready with full accessibility features"
    });
  };

  const handleWorkflowComplete = () => {
    setShowWorkflow(false);
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
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/videos')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Videos
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{video.title}</h1>
            <div className="flex items-center gap-4 mt-2">
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
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2 space-y-6">
            {videoUrl && (
              <div className="aspect-video">
                {showWorkflow ? (
                  <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Play className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Complete the transcript workflow to enable video playback
                      </p>
                    </div>
                  </div>
                ) : (
                  <CleanAxessiblePlayer
                    videoSrc={videoUrl}
                    posterSrc={video.thumbnail_url || undefined}
                    title={video.title}
                    videoId={video.id}
                    contentType={video.content_type as 'recipe' | 'education'}
                    captions={captions}
                    className="w-full h-full"
                  />
                )}
              </div>
            )}

            {/* Video Description */}
            {video.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{video.description}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Workflow Panel */}
          <div className="space-y-6">
            {showWorkflow ? (
              <TranscriptWorkflow
                videoId={video.id}
                videoUrl={videoUrl}
                onTranscriptReady={handleTranscriptReady}
                onWorkflowComplete={handleWorkflowComplete}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Video Ready</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      ✓
                    </div>
                    <h3 className="font-semibold text-green-700 mb-2">
                      Accessibility Complete
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Your video now includes captions with intention, timing, and speaker identification
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-muted rounded">
                        <div className="font-medium">Captions</div>
                        <div className="text-green-600">✓ Ready</div>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <div className="font-medium">Segments</div>
                        <div className="text-green-600">{captions.length}</div>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <div className="font-medium">Speakers</div>
                        <div className="text-green-600">Identified</div>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <div className="font-medium">Database</div>
                        <div className="text-green-600">✓ Saved</div>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowWorkflow(true)}
                    className="w-full"
                  >
                    Edit Transcript
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Video Info */}
            <Card>
              <CardHeader>
                <CardTitle>Video Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Language:</span>
                  <span>{getLanguageDisplay(video.language)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Content Type:</span>
                  <span className="capitalize">{video.content_type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{new Date(video.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{formatDuration(video.duration_seconds)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
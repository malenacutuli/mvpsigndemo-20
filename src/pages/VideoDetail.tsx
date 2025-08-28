import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPlayerWithTranscript } from "@/components/VideoPlayerWithTranscript";
import type { CaptionSegment } from "@/components/CaptionsWithIntention";

interface Video {
  id: string;
  title: string;
  description: string | null;
  language: string;
  content_type: string;
  status: string;
  storage_path: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

interface VoiceOption {
  id: string;
  name: string;
  description: string;
}

interface ASLOption {
  id: string;
  name: string;
  description: string;
}

const VideoDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [captions, setCaptions] = useState<CaptionSegment[] | null>(null);
  
  // Voice and ASL Avatar options for accessibility
  const [selectedVoice] = useState<VoiceOption>({
    id: 'gordon-ramsay',
    name: 'Gordon Ramsay Style',
    description: 'Passionate cooking voice'
  });
  
  const [selectedASLAvatar] = useState<ASLOption>({
    id: 'chef-avatar',
    name: 'ASL Chef',
    description: 'Professional cooking instructor'
  });

  useEffect(() => {
    console.log('🚀 VideoDetail component mounted with ID:', id);
    if (id) {
      console.log('✅ ID found, fetching video...');
      fetchVideo();
    } else {
      console.error('❌ No video ID found in URL');
    }
  }, [id]);

  const fetchVideo = async () => {
    console.log('🎬 Starting to fetch video with ID:', id);
    try {
      console.log('🔍 Making database query for video...');
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single();
      
      console.log('📊 Database response - Data:', data, 'Error:', error);
      
      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
      
      console.log('✅ Video data loaded successfully:', data);
      setVideo(data);
      
      // Get public URL for video if storage path exists
      if (data.storage_path) {
        console.log('🔗 Getting public URL for video:', data.storage_path);
        
        // Since the videos bucket is now public, use direct public URL
        const { data: publicUrl } = supabase.storage
          .from('videos')
          .getPublicUrl(data.storage_path);
        
        if (publicUrl?.publicUrl) {
          console.log('✅ Public video URL set:', publicUrl.publicUrl);
          setVideoUrl(publicUrl.publicUrl);
        } else {
          // Fallback to signed URL if public URL fails
          console.log('⚠️ Public URL failed, trying signed URL...');
          const { data: signedUrl, error: storageError } = await supabase.storage
            .from('videos')
            .createSignedUrl(data.storage_path, 3600); // 1 hour
          
          console.log('🔗 Signed URL response:', signedUrl, 'Error:', storageError);
          
          if (signedUrl?.signedUrl) {
            console.log('✅ Fallback signed URL set:', signedUrl.signedUrl);
            setVideoUrl(signedUrl.signedUrl);
          } else {
            console.warn('⚠️ No URL could be generated for video');
          }
        }
      } else {
        console.warn('⚠️ No storage path found for video');
      }
      
      // Load existing captions/transcripts for this video
      console.log('📝 Loading transcripts...');
      await loadVideoTranscripts(data.id);
    } catch (error) {
      console.error('❌ Error fetching video:', error);
    } finally {
      console.log('🏁 Fetch video completed, setting loading to false');
      setLoading(false);
    }
  };

  const loadVideoTranscripts = async (videoId: string) => {
    try {
      const { data: segments, error } = await supabase
        .from('transcript_segments')
        .select('*')
        .eq('video_id', videoId)
        .order('start_time', { ascending: true });
      
      if (error) {
        console.error('Error loading transcripts:', error);
        return;
      }
      
      if (segments && segments.length > 0) {
        // Convert database segments to CaptionSegment format
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
            speaker: segment.speaker || 'narrator' as any,
            startTime: segment.start_time,
            endTime: segment.end_time,
            words,
          };
        });
        
        setCaptions(captionSegments);
        console.log('Loaded captions for video:', captionSegments.length, 'segments');
      }
    } catch (error) {
      console.error('Error loading video transcripts:', error);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "Unknown";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'uploading': return 'bg-blue-100 text-blue-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLanguageDisplay = (lang: string) => {
    const languages: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese'
    };
    return languages[lang] || lang;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="aspect-video w-full" />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Video Not Found</h1>
            <p className="text-muted-foreground mb-6">The video you're looking for doesn't exist or you don't have permission to view it.</p>
            <Button onClick={() => navigate('/videos')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Videos
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/videos')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Videos
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{video.title}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge className={getStatusColor(video.status)}>
                      {video.status}
                    </Badge>
                    <span>•</span>
                    <span>{getLanguageDisplay(video.language)}</span>
                    <span>•</span>
                    <span>{formatDuration(video.duration_seconds)}</span>
                    <span>•</span>
                    <span>{new Date(video.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              {video.description && (
                <p className="text-muted-foreground">{video.description}</p>
              )}
            </CardHeader>
            <CardContent>
              {videoUrl ? (
                <VideoPlayerWithTranscript
                  videoSrc={videoUrl}
                  posterSrc={video.thumbnail_url || undefined}
                  title={video.title}
                  videoId={video.id}
                  language={video.language}
                  selectedVoice={selectedVoice}
                  selectedASLAvatar={selectedASLAvatar}
                  contentType={video.content_type === 'education' ? 'education' : 'recipe'}
                  className="w-full"
                />
              ) : (
                <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Play className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Video not available</p>
                  </div>
                </div>
              )}
              
              {/* Accessibility Information */}
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Accessibility Features
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Captions</Badge>
                    <span className="text-muted-foreground">AI-powered with emotional context</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Audio Description</Badge>
                    <span className="text-muted-foreground">Celebrity-style narration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">ASL Avatar</Badge>
                    <span className="text-muted-foreground">AI-animated sign language</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Use the accessibility controls in the video player to toggle these features on or off based on your preferences.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default VideoDetail;
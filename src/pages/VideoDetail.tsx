import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

const VideoDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchVideo();
    }
  }, [id]);

  const fetchVideo = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      setVideo(data);
      
      // Get signed URL for video if storage path exists
      if (data.storage_path) {
        const { data: signedUrl } = await supabase.storage
          .from('videos')
          .createSignedUrl(data.storage_path, 3600); // 1 hour
        
        if (signedUrl?.signedUrl) {
          setVideoUrl(signedUrl.signedUrl);
        }
      }
    } catch (error) {
      console.error('Error fetching video:', error);
    } finally {
      setLoading(false);
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
                <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
                  <video 
                    controls 
                    className="w-full h-full"
                    poster={video.thumbnail_url || undefined}
                  >
                    <source src={videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Play className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Video not available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default VideoDetail;
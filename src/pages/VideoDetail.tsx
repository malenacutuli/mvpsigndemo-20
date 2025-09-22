import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Share, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPlayerWithTranscript } from "@/components/VideoPlayerWithTranscript";
import { EmbedSettings } from "@/components/EmbedSettings";
import { EmbedAnalytics } from "@/components/EmbedAnalytics";
import { AccessibleVideoExporter } from "@/components/AccessibleVideoExporter";
import { VideoPublishingControls } from "@/components/VideoPublishingControls";
import { useToast } from "@/hooks/use-toast";
import type { CaptionSegment } from "@/components/CaptionsWithIntention";
import { useTranslation } from 'react-i18next';
import { VoiceOption, findVoiceById } from "@/types/voice";

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
  is_public: boolean;
  channel_id: string | null;
}

interface ASLOption {
  id: string;
  name: string;
  description: string;
}

const VideoDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showEmbedSettings, setShowEmbedSettings] = useState(false);
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const [characterColors, setCharacterColors] = useState<{ [key: string]: string }>({});
  const [deletingVideo, setDeletingVideo] = useState(false);
  const { toast } = useToast();
  
  // Voice and ASL Avatar options for accessibility
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('gordon-ramsay');
  
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
      
      // Get public URL for video since the videos bucket is now public
      if (data.storage_path) {
        console.log('🔗 Getting public URL for video:', data.storage_path);
        
        // Since the videos bucket is now public, use direct public URL
        const { data: publicUrl } = supabase.storage
          .from('videos')
          .getPublicUrl(data.storage_path);
        
        if (publicUrl?.publicUrl) {
          console.log('✅ Public video URL set:', publicUrl.publicUrl);
          
          // Test if the video URL is accessible
          try {
            const response = await fetch(publicUrl.publicUrl, { method: 'HEAD' });
            if (response.ok) {
              console.log('✅ Video URL is accessible');
              setVideoUrl(publicUrl.publicUrl);
            } else {
              console.error('❌ Video URL not accessible, status:', response.status);
              // Try manual fallback URL
              const manualPublicUrl = `https://faeyekynudyzeotbjfsj.supabase.co/storage/v1/object/public/videos/${data.storage_path}`;
              console.log('🔧 Trying manual fallback URL:', manualPublicUrl);
              setVideoUrl(manualPublicUrl);
            }
          } catch (fetchError) {
            console.error('❌ Error testing video URL:', fetchError);
            // Use the URL anyway as fallback
            setVideoUrl(publicUrl.publicUrl);
          }
        } else {
          console.error('❌ Failed to generate public URL for video');
          // Construct public URL manually as fallback
          const manualPublicUrl = `https://faeyekynudyzeotbjfsj.supabase.co/storage/v1/object/public/videos/${data.storage_path}`;
          console.log('🔧 Using manual public URL:', manualPublicUrl);
          setVideoUrl(manualPublicUrl);
        }
      } else {
        console.warn('⚠️ No storage path found for video');
      }
      
      // Load existing captions/transcripts for this video
      console.log('📝 Loading captions for export functionality...');
      await loadExistingCaptions();
    } catch (error) {
      console.error('❌ Error fetching video:', error);
    } finally {
      console.log('🏁 Fetch video completed, setting loading to false');
      setLoading(false);
    }
  };

  const deleteVideo = async () => {
    if (!video || !window.confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return;
    }

    setDeletingVideo(true);
    try {
      // Delete associated storage files
      if (video.storage_path) {
        try {
          await supabase.storage
            .from('videos')
            .remove([video.storage_path]);
        } catch (storageError) {
          console.warn('Error deleting video file from storage:', storageError);
        }
      }

      // Delete thumbnail from storage
      if (video.thumbnail_url) {
        try {
          const thumbnailPath = video.thumbnail_url.split('/').pop();
          if (thumbnailPath) {
            await supabase.storage
              .from('thumbnails')
              .remove([thumbnailPath]);
          }
        } catch (storageError) {
          console.warn('Error deleting thumbnail from storage:', storageError);
        }
      }

      // Delete the video record from database
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', video.id);

      if (error) throw error;

      toast({
        title: "Video deleted",
        description: "The video has been successfully deleted.",
      });

      // Navigate back to videos page
      navigate('/videos');
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: "Error deleting video",
        description: "There was an error deleting the video. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeletingVideo(false);
    }
  };

  const loadExistingCaptions = async () => {
    if (!id) return;
    
    try {
      const lang = video?.language || 'en';

      // First, fetch the latest edited transcript for this video/language
      const { data: transcripts, error: txError } = await supabase
        .from('transcripts')
        .select('id, updated_at')
        .eq('video_id', id)
        .eq('language', lang)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (txError) throw txError;

      let data: any[] | null = null;

      if (transcripts && transcripts.length > 0) {
        // Use ONLY the edited transcript's segments
        const transcriptId = transcripts[0].id;
        const { data: segs, error: segErr } = await supabase
          .from('transcript_segments')
          .select('*')
          .eq('transcript_id', transcriptId)
          .order('idx', { ascending: true })
          .order('start_time', { ascending: true });

        if (segErr) throw segErr;
        data = segs || [];
        console.log('🎯 VIDEO DETAIL: Using edited transcript segments by transcript_id:', transcriptId, 'count:', data.length);
      } else {
        // Fallback: base video-level segments only (exclude other transcripts)
        const { data: segs, error: segErr } = await supabase
          .from('transcript_segments')
          .select('*')
          .eq('video_id', id)
          .eq('language', lang)
          .is('transcript_id', null)
          .order('start_time', { ascending: true });

        if (segErr) throw segErr;
        data = segs || [];
        console.log('🗄️ VIDEO DETAIL: Using base video-level transcript segments. Count:', data.length);
      }

      if (data && data.length > 0) {
        const captionSegments = data.map((seg, index) => ({
          text: seg.text,
          speaker: seg.speaker || `Speaker ${(index % 3) + 1}`,
          startTime: Number(seg.start_time),
          endTime: Number(seg.end_time),
          speakerColor: seg.speaker_color || getSpeakerColor(index),
          words: (seg.words && Array.isArray(seg.words) && seg.words.length > 0)
            ? seg.words
            : seg.text.split(' ').map((word: string, i: number) => ({
                text: word,
                startTime: Number(seg.start_time) + (i * (Number(seg.end_time) - Number(seg.start_time)) / seg.text.split(' ').length),
                endTime: Number(seg.start_time) + ((i + 1) * (Number(seg.end_time) - Number(seg.start_time)) / seg.text.split(' ').length),
                emphasis: 'normal' as const,
                pitch: 'normal' as const,
              })),
          volume: 50,
          pitch: 160,
          type: 'dialogue' as const,
          isOffCamera: seg.is_off_camera || false,
        }));
        
        setCaptions(captionSegments);
        
        // Build character colors map
        const colors = data.reduce((acc: { [key: string]: string }, seg: any) => {
          if (seg.speaker && seg.speaker_color) {
            acc[seg.speaker] = seg.speaker_color;
          }
          return acc;
        }, {} as { [key: string]: string });
        setCharacterColors(colors);
        
        console.log('✅ VIDEO DETAIL: Loaded captions for export:', captionSegments.length, 'segments');
      }
    } catch (error) {
      console.error('Error loading captions:', error);
    }
  };

  const getSpeakerColor = (index: number) => {
    const colors = ['#E5E517', '#17E5E5', '#E51717', '#E58017', '#17E517', '#E517E5'];
    return colors[index % colors.length];
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
            <h1 className="text-2xl font-bold mb-4">{t('videoDetail.notFound')}</h1>
            <p className="text-muted-foreground mb-6">The video you're looking for doesn't exist or you don't have permission to view it.</p>
            <Button onClick={() => navigate('/videos')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('videoDetail.backToVideos')}
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
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate('/videos')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('videoDetail.backToVideos')}
            </Button>
            <div className="flex items-center gap-2">
              <VideoPublishingControls
                videoId={video.id}
                isPublic={video.is_public}
                contentType={video.content_type}
                description={video.description}
                channelId={video.channel_id}
                videoStatus={video.status}
                videoLanguage={video.language}
                onUpdate={fetchVideo}
                onDelete={deleteVideo}
                isDeleting={deletingVideo}
              />
              <Button 
                variant="outline" 
                onClick={() => setShowEmbedSettings(!showEmbedSettings)}
              >
                <Share className="w-4 h-4 mr-2" />
                {t('videoDetail.embed.title')}
              </Button>
            </div>
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
            </CardHeader>
            <CardContent>
              {videoUrl ? (
                <div className="space-y-4">
                  <VideoPlayerWithTranscript
                    videoSrc={videoUrl}
                    posterSrc={video.thumbnail_url || undefined}
                    title={video.title}
                    videoId={video.id}
                    language={video.language}
                    selectedVoice={findVoiceById(selectedVoiceId) || { id: selectedVoiceId, name: selectedVoiceId, description: '' }}
                    selectedASLAvatar={selectedASLAvatar}
                    contentType={['education','children','kids'].includes(video.content_type) ? 'education' : 'recipe'}
                    className="w-full"
                    isPublic={video.is_public}
                    videoStatus={video.status}
                  />
                  
                  {/* Video Description - Now below the video */}
                  {video.description && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                      <h3 className="font-semibold mb-2">{t('videoDetail.description')}</h3>
                      <p className="text-muted-foreground">{video.description}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Play className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">{t('videoDetail.unavailableTitle')}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {video.storage_path ? t('videoDetail.unavailableGenerating') : t('videoDetail.unavailableNoFile')}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Immersive Features Section */}
              <div className="mt-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  {t('videoDetail.immersiveFeatures')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">CC</span>
                      </div>
                      <h3 className="font-semibold">Captions with Intention</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Emotional context and speaker identification</p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-semibold text-sm">AD</span>
                      </div>
                      <h3 className="font-semibold">Audio Descriptions</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Describes visual elements for screen readers</p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-semibold text-sm">VA</span>
                      </div>
                      <h3 className="font-semibold">Video Analysis</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">AI-powered analysis and narration generation</p>
                  </Card>
                </div>
                
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {t('videoDetail.immersiveTip')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Accessible Video - Temporarily Hidden */}
          {/* {captions.length > 0 && videoUrl && (
            <AccessibleVideoExporter
              videoUrl={videoUrl}
              videoId={video.id}
              captions={captions}
              characterColors={characterColors}
              currentLanguage={video.language}
              onExportComplete={(downloadUrl) => {
                console.log('✅ Export complete:', downloadUrl);
              }}
            />
          )} */}

          {/* Embed Settings and Analytics */}
          {showEmbedSettings && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EmbedSettings 
                videoId={video.id} 
                onSettingsChange={() => {
                  // Optionally refresh video data
                  fetchVideo();
                }}
              />
              <EmbedAnalytics videoId={video.id} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default VideoDetail;
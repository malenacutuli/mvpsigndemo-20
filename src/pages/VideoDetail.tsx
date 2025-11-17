import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fixAdLanguages } from "@/utils/fixAdLanguages";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, Share, Edit, Mic, AlertCircle, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoPlayerWithTranscript } from "@/components/VideoPlayerWithTranscript";
import { EmbedSettings } from "@/components/EmbedSettings";
import { EmbedAnalytics } from "@/components/EmbedAnalytics";
import { VideoExportButton } from "@/components/VideoExportButton";
import { VideoPublishingControls } from "@/components/VideoPublishingControls";
import { VideoAnalysisPanel } from "@/components/VideoAnalysisPanel";
import { ContentMetadataGenerator } from "@/components/ContentMetadataGenerator";
import { SocialClipsSection } from "@/components/SocialClipsSection";

import { useToast } from "@/hooks/use-toast";
import type { CaptionSegment } from "@/components/CaptionsWithIntention";
import { useTranslation } from 'react-i18next';
import { VoiceOption, findVoiceById } from "@/types/voice";
import { MessageSquare } from 'lucide-react';

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

interface SignLanguageOption {
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
  const [characters, setCharacters] = useState<any[]>([]);
  const [audioDescriptions, setAudioDescriptions] = useState<any[]>([]);
  const [deletingVideo, setDeletingVideo] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<string>(''); // set after video loads
  const { toast } = useToast();
  
  const handleLanguageChange = (newLanguage: string) => {
    console.log('🌍 Language changed to:', newLanguage);
    setCurrentLanguage(newLanguage);
  };
  
  // Voice and Sign Language Avatar options for accessibility
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('gordon-ramsay');
  
  const [selectedSignLanguageAvatar] = useState<SignLanguageOption>({
    id: 'chef-avatar',
    name: 'Sign Language Chef',
    description: 'Professional cooking instructor'
  });

  useEffect(() => {
    console.log('🚀 VideoDetail component mounted with ID:', id);
    if (id) {
      console.log('✅ ID found, fetching video...');
      fetchVideo();
      
      // Auto-fix AD language fields
      fixAdLanguages(id).then((result) => {
        if (result.success) {
          console.log('🔧 AD languages fixed:', result.updated);
        }
      });
    } else {
      console.error('❌ No video ID found in URL');
    }
    
    // Get current user
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
      setCurrentLanguage(data?.language || 'en');
      
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

  const handleTranscriptReady = (newCaptions: CaptionSegment[]) => {
    setCaptions(newCaptions);
    console.log('✅ VIDEO DETAIL: Transcript ready with', newCaptions.length, 'segments');
    toast({
      title: "Transcript Ready",
      description: `Processed ${newCaptions.length} segments successfully`
    });
  };

  const handleCharactersUpdate = (updatedCharacters: any[]) => {
    setCharacters(updatedCharacters);
    console.log('🎭 VIDEO DETAIL: Characters updated:', updatedCharacters.length);
    
    // Refresh captions with character-specific settings
    if (captions.length > 0) {
      const characterMap = updatedCharacters.reduce((acc, char) => {
        acc[char.name] = char;
        return acc;
      }, {} as { [key: string]: any });
      
      const refreshedCaptions = captions.map(caption => {
        const character = characterMap[caption.speaker];
        if (character) {
          return {
            ...caption,
            speakerColor: character.color,
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
      console.log('🔄 VIDEO DETAIL: Captions refreshed with character updates');
    }
  };

  const handleAudioDescriptionsUpdate = (updatedDescriptions: any[]) => {
    setAudioDescriptions(updatedDescriptions);
    console.log('✅ VIDEO DETAIL: Audio descriptions updated:', updatedDescriptions.length, 'descriptions');
  };

  const handleWorkflowComplete = () => {
    console.log('✅ VIDEO DETAIL: Workflow completed');
    toast({
      title: "Workflow Complete",
      description: "All video processing steps have been completed"
    });
  };

  const loadExistingCaptions = async () => {
    if (!id) return;
    
    try {
      const lang = video?.language || 'en';

      // ✅ STEP 1: Find latest transcript for this video+language
      const { data: latestTranscript } = await supabase
        .from('transcripts')
        .select('id')
        .eq('video_id', id)
        .eq('language', lang)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      // ✅ STEP 2: Load segments from ONE canonical source only
      const segQuery = supabase
        .from('transcript_segments_clean')
        .select('*')
        .eq('video_id', id)
        .eq('language', lang)
        .order('start_time', { ascending: true });
      
      let data: any[] | null = null;
      
      if (latestTranscript?.id) {
        // Use ONLY the latest transcript's segments
        const { data: segs, error: segErr } = await segQuery.eq('transcript_id', latestTranscript.id);
        if (segErr) throw segErr;
        data = segs || [];
        console.log('🎯 VIDEO DETAIL: Using latest transcript segments (transcript_id:', latestTranscript.id, ') - Count:', data.length);
      } else {
        // Use ONLY base video-level segments (no transcript_id)
        const { data: segs, error: segErr } = await segQuery.is('transcript_id', null);
        if (segErr) throw segErr;
        data = segs || [];
        console.log('🗄️ VIDEO DETAIL: Using base video-level segments (transcript_id IS NULL) - Count:', data.length);
      }
      
      // ✅ STEP 3: Client-side deduplication by timing+text (safety net)
      const dedupMap = new Map<string, any>();
      for (const seg of data || []) {
        const key = `${seg.start_time}|${seg.end_time}|${seg.text}`;
        const existing = dedupMap.get(key);
        
        // Priority: character_id > has words > first occurrence
        if (!existing || 
            (seg.character_id && !existing.character_id) ||
            (seg.words && !existing.words) ||
            (!existing.character_id && !existing.words && seg.speaker !== 'Speaker')) {
          dedupMap.set(key, seg);
        }
      }
      
      const cleanedData = Array.from(dedupMap.values()).sort((a, b) => a.start_time - b.start_time);
      
      if (data && data.length !== cleanedData.length) {
        console.log(`🧹 DEDUPE: Removed ${data.length - cleanedData.length} duplicate segments (${data.length} → ${cleanedData.length})`);
      }

      if (cleanedData && cleanedData.length > 0) {
        const captionSegments = cleanedData.map((seg, index) => {
          // Priority: character name > speaker > speaker_asr_label > fallback
          const displayedSpeaker = seg.speaker || seg.speaker_asr_label || 'Unknown';
          
          return {
            text: seg.text,
            speaker: displayedSpeaker,
            startTime: Number(seg.start_time),
            endTime: Number(seg.end_time),
            // ✅ Prefer DB color when present
            speakerColor: seg.speaker_color || getSpeakerColor(displayedSpeaker),
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
          };
        });
        
        setCaptions(captionSegments);
        
        // Build character colors map
        const colors = cleanedData.reduce((acc: { [key: string]: string }, seg: any) => {
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

  // Use unified color palette from cwiPalette
  const getSpeakerColor = (speakerName: string) => {
    const { getSpeakerColor: getColor } = require('@/lib/cwiPalette');
    return getColor(speakerName, characterColors);
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
            <Button variant="ghost" onClick={() => navigate('/videos')} className="font-light">
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
                variant="default"
                onClick={() => navigate(`/video/${video.id}/edit`)}
                className="font-light"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Premium Editor
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowEmbedSettings(!showEmbedSettings)}
                className="font-light"
              >
                <Share className="w-4 h-4 mr-2" />
                {t('videoDetail.embed.title')}
              </Button>
            </div>
          </div>

          <Card className="rounded-xl shadow-soft border">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-3xl md:text-4xl font-light text-foreground">{video.title}</CardTitle>
                  <div className="flex items-center gap-2 text-base text-muted-foreground font-light">
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
                    selectedSignLanguageAvatar={selectedSignLanguageAvatar}
                    contentType={['education','children','kids'].includes(video.content_type) ? 'education' : 'recipe'}
                    className="w-full"
                    isPublic={video.is_public}
                    videoStatus={video.status}
                    onLanguageChange={handleLanguageChange}
                  />
                  
                  {/* Video Description - Now below the video */}
                  {video.description && (
                    <div className="mt-4 p-6 bg-muted/50 rounded-xl">
                      <h3 className="text-xl font-light text-foreground mb-2">{t('videoDetail.description')}</h3>
                      <p className="text-base font-light text-muted-foreground leading-relaxed">{video.description}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video w-full bg-muted rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <Play className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-base font-light text-muted-foreground">{t('videoDetail.unavailableTitle')}</p>
                    <p className="text-sm font-light text-muted-foreground mt-2 leading-relaxed">
                      {video.storage_path ? t('videoDetail.unavailableGenerating') : t('videoDetail.unavailableNoFile')}
                    </p>
                  </div>
                </div>
              )}
              
            </CardContent>
          </Card>

          {/* Content Metadata Generator */}
          {videoUrl && video.status === 'uploaded' && (
            <ContentMetadataGenerator video={video} />
          )}

          {/* Social Clips Generator */}
          {videoUrl && video.status === 'uploaded' && (
            <SocialClipsSection 
              video={video} 
              videoDuration={video.duration_seconds || 0} 
            />
          )}

          {/* Export Accessible Video with Current Language */}
          {videoUrl && ['uploaded', 'processing', 'ready'].includes(video.status) && captions.length > 0 && (
            <Card className="rounded-xl shadow-soft border">
              <CardHeader>
                <CardTitle className="text-3xl md:text-4xl font-light text-foreground">{t('videoDetail.export.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-base font-light text-muted-foreground leading-relaxed">
                    {t('videoDetail.export.description')}
                    {captions.length > 0 && (
                      <span className="block mt-1">
                        {t('videoDetail.export.currentLanguage', { language: currentLanguage.toUpperCase() })}
                      </span>
                    )}
                  </p>
                  <VideoExportButton
                    videoId={video.id}
                    videoTitle={video.title}
                    currentLanguage={currentLanguage}
                    onExportComplete={fetchVideo}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warning for Videos Without Transcripts */}
          {videoUrl && ['uploaded', 'processing', 'ready'].includes(video.status) && captions.length === 0 && (
            <Card className="rounded-xl shadow-soft border">
              <CardHeader>
                <CardTitle className="text-3xl md:text-4xl font-light text-foreground">{t('videoDetail.export.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className="rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-base font-light leading-relaxed">
                    {t('videoDetail.export.noTranscript')}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}


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
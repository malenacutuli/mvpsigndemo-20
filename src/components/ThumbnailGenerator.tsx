import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { extractVideoFrame } from '@/lib/videoFrameExtractor';

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  storage_path: string | null;
  status: string;
}

interface ThumbnailGeneratorProps {
  videos: Video[];
  onThumbnailsGenerated: () => void;
}

export const ThumbnailGenerator: React.FC<ThumbnailGeneratorProps> = ({
  videos,
  onThumbnailsGenerated
}) => {
  const [generating, setGenerating] = useState<string[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [failed, setFailed] = useState<string[]>([]);
  const { toast } = useToast();

  // Get videos without thumbnails
  const videosWithoutThumbnails = videos.filter(video => 
    !video.thumbnail_url && video.storage_path && (video.status === 'ready' || video.status === 'uploaded')
  );

  const generateThumbnail = async (video: Video) => {
    if (!video.storage_path) return;

    setGenerating(prev => [...prev, video.id]);
    setFailed(prev => prev.filter(id => id !== video.id));

    try {
      // Get video URL
      const { data: { publicUrl: videoUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(video.storage_path);

      console.log(`🎬 Generating thumbnail for: ${video.title}`);
      console.log(`📹 Video URL: ${videoUrl}`);

      // Download the video file
      console.log('⬇️ Downloading video file...');
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.statusText}`);
      }
      
      const videoBlob = await videoResponse.blob();
      const videoFile = new File([videoBlob], `${video.id}.mp4`, { type: 'video/mp4' });
      
      console.log(`📁 Video downloaded: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);

      // Extract frame from the middle of the video
      console.log('🖼️ Extracting video frame...');
      const extractedFrame = await extractVideoFrame(videoFile, {
        quality: 0.9,
        maxWidth: 1280,
        maxHeight: 720
      });

      console.log(`✅ Frame extracted: ${extractedFrame.width}x${extractedFrame.height}`);

      // Upload thumbnail to Supabase Storage
      const thumbnailFileName = `${video.id}-thumbnail.jpg`;
      console.log(`☁️ Uploading thumbnail: ${thumbnailFileName}`);
      
      const { data: thumbnailUpload, error: thumbnailUploadError } = await supabase.storage
        .from('thumbnails')
        .upload(thumbnailFileName, extractedFrame.blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (thumbnailUploadError) {
        throw thumbnailUploadError;
      }

      // Get public URL for the thumbnail
      const { data: { publicUrl: thumbnailUrl } } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(thumbnailFileName);

      console.log(`🔗 Thumbnail URL: ${thumbnailUrl}`);

      // Update video record with thumbnail URL
      const { error: updateError } = await supabase
        .from('videos')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', video.id);

      if (updateError) {
        throw updateError;
      }

      console.log('✅ Thumbnail generation completed successfully!');

      setCompleted(prev => [...prev, video.id]);
      toast({
        title: "Thumbnail generated",
        description: `High-quality thumbnail created for "${video.title}"`
      });

    } catch (error) {
      console.error(`❌ Failed to generate thumbnail for ${video.title}:`, error);
      setFailed(prev => [...prev, video.id]);
      toast({
        title: "Thumbnail generation failed",
        description: `Failed to create thumbnail for "${video.title}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setGenerating(prev => prev.filter(id => id !== video.id));
    }
  };

  const generateAllThumbnails = async () => {
    for (const video of videosWithoutThumbnails) {
      if (!generating.includes(video.id) && !completed.includes(video.id)) {
        await generateThumbnail(video);
        // Small delay between requests to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Refresh the video list after all thumbnails are generated
    onThumbnailsGenerated();
  };

  const getVideoStatus = (videoId: string) => {
    if (generating.includes(videoId)) return 'generating';
    if (completed.includes(videoId)) return 'completed';
    if (failed.includes(videoId)) return 'failed';
    return 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'generating':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <ImageIcon className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generating':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (videosWithoutThumbnails.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Generate Thumbnails
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {videosWithoutThumbnails.length} video(s) need thumbnails
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={generateAllThumbnails}
            disabled={generating.length > 0}
            className="flex-1"
          >
            {generating.length > 0 ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              `Generate All Thumbnails (${videosWithoutThumbnails.length})`
            )}
          </Button>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {videosWithoutThumbnails.map(video => {
            const status = getVideoStatus(video.id);
            return (
              <div key={video.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm truncate">{video.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(status)}>
                    {getStatusIcon(status)}
                    <span className="ml-1 capitalize">{status}</span>
                  </Badge>
                  {status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateThumbnail(video)}
                      disabled={generating.includes(video.id)}
                    >
                      Generate
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
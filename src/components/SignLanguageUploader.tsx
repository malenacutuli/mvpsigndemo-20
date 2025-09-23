import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { HandHelping, Upload, X, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface SignLanguageUploaderProps {
  videoId: string;
  segmentId: string;
  startTimeMs: number;
  endTimeMs: number;
  onUploadComplete?: (clipUrl: string) => void;
  existingClipUrl?: string;
}

export const SignLanguageUploader: React.FC<SignLanguageUploaderProps> = ({
  videoId,
  segmentId,
  startTimeMs,
  endTimeMs,
  onUploadComplete,
  existingClipUrl
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [clipUrl, setClipUrl] = useState(existingClipUrl || '');
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load existing Sign Language clip on mount
  useEffect(() => {
    const loadExistingClip = async () => {
      try {
        const { data, error } = await supabase
          .from('sign_language_clips')
          .select('clip_url')
          .eq('transcript_segment_id', segmentId)
          .single();

        if (data && !error) {
          setClipUrl(data.clip_url);
        }
      } catch (error) {
        // No existing clip - this is normal
        console.log('No existing Sign Language clip for segment:', segmentId);
      } finally {
        setIsLoading(false);
      }
    };

    if (segmentId && segmentId.length > 0 && !existingClipUrl) {
      loadExistingClip();
    } else {
      setIsLoading(false);
    }
  }, [segmentId, existingClipUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: "Invalid file type",
        description: "Please select a video file (.mp4, .webm, .mov, etc.)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a video file smaller than 50MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique filename
      const fileExtension = file.name.split('.').pop() || 'mp4';
      const fileName = `${segmentId}.${fileExtension}`;
      const filePath = `sign_language_clips/${videoId}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Save to database
      const { error: dbError } = await supabase
        .from('sign_language_clips')
        .upsert({
          video_id: videoId,
          transcript_segment_id: segmentId && segmentId.length > 0 ? segmentId : null, // Only use valid segment IDs
          start_time_ms: startTimeMs,
          end_time_ms: endTimeMs,
          clip_url: publicUrl,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (dbError) throw dbError;

      setClipUrl(publicUrl);
      onUploadComplete?.(publicUrl);
      
      toast({
        title: "Sign Language clip uploaded",
        description: "Your Sign Language clip has been successfully uploaded and linked to this segment.",
      });

    } catch (error) {
      console.error('Error uploading Sign Language clip:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload Sign Language clip. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveClip = async () => {
    try {
      // Remove from database
      const { error } = await supabase
        .from('sign_language_clips')
        .delete()
        .eq('transcript_segment_id', segmentId);

      if (error) throw error;

      setClipUrl('');
      onUploadComplete?.('');
      
      toast({
        title: "Sign Language clip removed",
        description: "The Sign Language clip has been removed from this segment.",
      });

    } catch (error) {
      console.error('Error removing Sign Language clip:', error);
      toast({
        title: "Removal failed",
        description: "Failed to remove Sign Language clip. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <HandHelping className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Sign Language Clip</span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 p-2 bg-accent/10 rounded-md">
          <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      ) : !segmentId || segmentId.length === 0 ? (
        <div className="flex items-center gap-2 p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-md">
          <span className="text-sm text-yellow-800 dark:text-yellow-200">
            Save transcript segment first to upload Sign Language clip
          </span>
        </div>
      ) : clipUrl ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 bg-accent/30 rounded-md">
            <Check className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-foreground">Sign Language clip attached</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveClip}
              className="ml-auto text-destructive hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <video 
            src={clipUrl} 
            className="w-full max-w-xs h-20 object-cover rounded border"
            muted
            controls={false}
            preload="metadata"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload Sign Language Clip'}
          </Button>
          
          {isUploading && (
            <Progress value={uploadProgress} className="w-full" />
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
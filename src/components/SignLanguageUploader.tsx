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

  const isValidUUID = (value: string | null | undefined): boolean => {
    if (!value) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  };

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

    // Strict validation: Must have valid segment ID before upload
    if (!isValidUUID(segmentId)) {
      toast({
        title: "Segment not saved",
        description: "You must save this transcript segment before uploading a Sign Language clip.",
        variant: "destructive",
      });
      return;
    }

    // Note: Database foreign key constraint will validate segment exists
    console.log("Uploading clip with segmentId:", segmentId);

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

    console.log("Uploading clip with segmentId:", segmentId);

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique filename using correct path convention
      const fileExtension = file.name.split('.').pop() || 'mp4';
      const fileName = `${segmentId}.${fileExtension}`;
      const filePath = `${videoId}/${fileName}`;

      // Safe user handling
      let userId: string | null = null;
      try {
        const { data: userData } = await supabase.auth.getUser();
        userId = userData?.user?.id ?? null;
      } catch (e) {
        console.warn("No user logged in:", e);
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 10;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 100);

      // Upload to Supabase Storage (sign_language_clips bucket)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('sign_language_clips')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      clearInterval(progressInterval);
      setUploadProgress(95);

      if (uploadError) throw new Error(`Storage error: ${uploadError.message}`);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('sign_language_clips')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Verify the uploaded file is actually accessible
      let accessible = false;
      try {
        const head = await fetch(publicUrl, { method: 'HEAD' });
        accessible = head.ok;
        console.info('[ASL Upload] Public URL HEAD status:', head.status, publicUrl);
        if (!accessible) {
          const probe = await fetch(publicUrl, { headers: { Range: 'bytes=0-1' } });
          console.info('[ASL Upload] Public URL PROBE status:', probe.status);
          accessible = probe.ok;
        }
      } catch (e) {
        console.warn('[ASL Upload] Public URL check failed:', e);
      }

      if (!accessible) {
        throw new Error(`Uploaded file is not accessible yet at ${publicUrl}. If this persists, check bucket public access/policies.`);
      }

      setUploadProgress(98);

      console.log("Public URL:", publicUrl);

      // Save to database - segmentId is guaranteed to be valid UUID
      console.log('💾 Saving ASL clip to database:', {
        video_id: videoId,
        transcript_segment_id: segmentId,
        start_time_ms: startTimeMs,
        end_time_ms: endTimeMs,
        clip_url: publicUrl,
        created_by: userId
      });

      const { error: dbError } = await supabase
        .from('sign_language_clips')
        .upsert(
          {
            video_id: videoId,
            transcript_segment_id: segmentId,
            start_time_ms: startTimeMs,
            end_time_ms: endTimeMs,
            clip_url: publicUrl,
            created_by: userId
          },
          { onConflict: 'transcript_segment_id' }
        );

      if (dbError) {
        console.error('💾 Database save error:', dbError);
        throw new Error(`DB error: ${dbError.message}`);
      }

      console.log('✅ ASL clip saved to database successfully');

      if (dbError) throw new Error(`DB error: ${dbError.message}`);

      setClipUrl(publicUrl);
      onUploadComplete?.(publicUrl);
      
      setUploadProgress(100);
      
      toast({
        title: "Sign Language clip uploaded",
        description: "Sign Language clip uploaded and linked to this segment.",
      });

    } catch (error) {
      console.error('Error uploading Sign Language clip:', error);
      toast({
        title: "Upload failed",
        description: `Failed to upload Sign Language clip: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Small delay to show 100% before hiding progress bar
      setTimeout(() => setUploadProgress(0), 500);
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
      ) : !segmentId || segmentId.length === 0 || !isValidUUID(segmentId) ? (
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
            className="w-full max-w-xs rounded border"
            muted
            controls
            preload="auto"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !isValidUUID(segmentId)}
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
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Video, FileText, Languages, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { VoiceCloningUploader } from '@/components/VoiceCloningUploader';
import { useAuth } from '@/hooks/useAuth';
import { extractVideoFrame } from '@/lib/videoFrameExtractor';
import { Upload as TusUpload } from 'tus-js-client';

interface UploadVideoProps {
  onUploadComplete?: (videoId: string) => void;
}

interface VideoData {
  id: string;
  title: string;
  description: string | null;
  language: string;
  content_type: string;
  status: string;
}

export const UploadVideo: React.FC<UploadVideoProps> = ({ onUploadComplete }) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('en');
  const [contentType, setContentType] = useState<string>('education');
  const [knownSpeakers, setKnownSpeakers] = useState<string[]>([]);
  const [newSpeaker, setNewSpeaker] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('Selected file:', {
        name: file.name,
        size: file.size,
        sizeInMB: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        type: file.type
      });
      
      if (file.type.startsWith('video/')) {
        setVideoFile(file);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a video file (MP4, MOV, etc.)",
          variant: "destructive"
        });
      }
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      console.log('Dropped file:', {
        name: file.name,
        size: file.size,
        sizeInMB: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        type: file.type
      });
      
      if (file.type.startsWith('video/')) {
        setVideoFile(file);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    }
  }, [title, toast]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const uploadToSupabaseStorage = async (
    file: File,
    videoId: string,
    onProgress: (pct: number) => void
  ): Promise<{ success: boolean; path?: string; error?: string }> => {
    console.log('[SUPABASE] Starting upload:', file.name, 'Size:', (file.size / (1024 * 1024 * 1024)).toFixed(2), 'GB');
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${videoId}.${fileExt}`;
    const objectPath = `originals/${fileName}`;
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      
      if (!accessToken) {
        throw new Error('You must be signed in to upload.');
      }

      const supabaseUrl = 'https://faeyekynudyzeotbjfsj.supabase.co';
      const storageUrl = supabaseUrl.replace('.supabase.co', '.storage.supabase.co');
      const endpoint = `${storageUrl}/storage/v1/upload/resumable`;

      await new Promise<void>((resolve, reject) => {
        const upload = new TusUpload(file, {
          endpoint,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          parallelUploads: 1,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: 'videos',
            objectName: objectPath,
            contentType: file.type,
            cacheControl: '3600',
          },
          headers: {
            authorization: `Bearer ${accessToken}`,
            'x-upsert': 'true',
          },
          chunkSize: 10 * 1024 * 1024, // 10MB chunks for optimal performance
          onError: (err) => {
            console.error('[SUPABASE] Upload error:', err);
            reject(err);
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const pct = Math.min(90, Math.round((bytesUploaded / bytesTotal) * 90));
            onProgress(pct);
            console.log(`[SUPABASE] Progress: ${pct}% (${(bytesUploaded / (1024 * 1024)).toFixed(1)}MB / ${(bytesTotal / (1024 * 1024)).toFixed(1)}MB)`);
          },
          onSuccess: () => {
            console.log('[SUPABASE] Upload complete');
            resolve();
          },
        });

        upload.findPreviousUploads().then((previous) => {
          if (previous.length) {
            console.log('[SUPABASE] Resuming previous upload');
            upload.resumeFromPreviousUpload(previous[0]);
          }
          upload.start();
        }).catch(() => {
          upload.start();
        });
      });

      console.log('[SUPABASE] Success:', objectPath);
      return { success: true, path: objectPath };
      
    } catch (error) {
      console.error('[SUPABASE] Failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      };
    }
  };

  const uploadVideo = async () => {
    if (!videoFile || !title.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a video file and enter a title",
        variant: "destructive"
      });
      return;
    }

    const userId = user?.id || crypto.randomUUID();
    let video: VideoData | null = null;

    try {
      setUploading(true);
      setUploadProgress(0);

      // Create video record first
      const insertData = {
        title: title.trim(),
        description: description.trim() || null,
        language,
        content_type: contentType,
        status: 'uploading' as const,
        user_id: userId,
        metadata: knownSpeakers.length > 0 ? { knownSpeakers } : null
      };
      
      console.log('Creating video record...', insertData);

      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .insert(insertData)
        .select()
        .maybeSingle() as { data: VideoData | null, error: any };

      if (videoError || !videoData) {
        console.error('Database error:', videoError);
        throw videoError || new Error('Failed to create video record');
      }

      video = videoData;
      console.log('Video record created:', video);

      // Upload to Supabase Storage
      toast({
        title: "Uploading video",
        description: "Please wait while we upload your video...",
      });

      const result = await uploadToSupabaseStorage(videoFile, video.id, setUploadProgress);
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      const storagePath = result.path!;
      console.log('Upload complete:', storagePath);
      
      // Extract thumbnail in background
      setUploadProgress(90);
      let thumbnailUrl: string | null = null;
      
      try {
        const extractedFrame = await extractVideoFrame(videoFile, {
          quality: 0.9,
          maxWidth: 1280,
          maxHeight: 720
        });

        const thumbnailFileName = `${video.id}-thumbnail.jpg`;
        const { error: thumbnailUploadError } = await supabase.storage
          .from('thumbnails')
          .upload(thumbnailFileName, extractedFrame.blob, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (!thumbnailUploadError) {
          const { data: { publicUrl: thumbUrl } } = supabase.storage
            .from('thumbnails')
            .getPublicUrl(thumbnailFileName);
          
          thumbnailUrl = thumbUrl;
          console.log('✅ Thumbnail uploaded:', thumbnailUrl);
        }
      } catch (frameError) {
        console.warn('⚠️ Frame extraction failed:', frameError);
      }
      
      // Update video record with storage path
      setUploadProgress(95);
      const { error: updateError } = await supabase
        .from('videos')
        .update({
          storage_path: storagePath,
          status: 'uploaded' as const,
          ...(thumbnailUrl && { thumbnail_url: thumbnailUrl })
        })
        .eq('id', video.id);

      if (updateError) throw updateError;
      
      setUploadProgress(100);
      
      toast({
        title: "Upload successful",
        description: "Your video has been uploaded successfully"
      });

      if (onUploadComplete) {
        onUploadComplete(video.id);
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      
      // Clean up video record if created
      if (video?.id) {
        await supabase.from('videos').delete().eq('id', video.id).eq('status', 'uploading');
      }

      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload video. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const addSpeaker = () => {
    if (newSpeaker.trim() && !knownSpeakers.includes(newSpeaker.trim())) {
      setKnownSpeakers([...knownSpeakers, newSpeaker.trim()]);
      setNewSpeaker('');
    }
  };

  const removeSpeaker = (speaker: string) => {
    setKnownSpeakers(knownSpeakers.filter(s => s !== speaker));
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-light">
          <Video className="w-5 h-5" />
          {t('upload.cardTitle')}
        </CardTitle>
        <CardDescription className="font-light">
          {t('upload.pageSubtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Section */}
        <div className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            {videoFile ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">{videoFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(videoFile.size)}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVideoFile(null);
                  }}
                >
                  Change file
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-light">
                  {t('upload.dropZone')}
                </p>
                <p className="text-xs text-muted-foreground font-light">
                  {t('upload.supportedFormats')}
                </p>
              </div>
            )}
            <input
              id="file-input"
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Uploading...</span>
                <span className="text-foreground font-medium">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Video Information */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('upload.title')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('upload.titlePlaceholder')}
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('upload.description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('upload.descriptionPlaceholder')}
              disabled={uploading}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">{t('upload.language')}</Label>
              <Select value={language} onValueChange={setLanguage} disabled={uploading}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="it">Italiano</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="ca">Català</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contentType">{t('upload.contentType')}</Label>
              <Select value={contentType} onValueChange={setContentType} disabled={uploading}>
                <SelectTrigger id="contentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="education">{t('upload.contentTypes.education')}</SelectItem>
                  <SelectItem value="entertainment">{t('upload.contentTypes.entertainment')}</SelectItem>
                  <SelectItem value="news">{t('upload.contentTypes.news')}</SelectItem>
                  <SelectItem value="training">{t('upload.contentTypes.training')}</SelectItem>
                  <SelectItem value="marketing">{t('upload.contentTypes.marketing')}</SelectItem>
                  <SelectItem value="other">{t('upload.contentTypes.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Known Speakers */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="speakers" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t('speakerEmotionDetection.knownSpeakers')}
            </Label>
            <p className="text-sm text-muted-foreground font-light">
              {t('speakerEmotionDetection.knownSpeakersHelp')}
            </p>
            <div className="flex gap-2">
              <Input
                id="speakers"
                value={newSpeaker}
                onChange={(e) => setNewSpeaker(e.target.value)}
                placeholder={t('speakerEmotionDetection.speakerPlaceholder')}
                disabled={uploading}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSpeaker();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addSpeaker}
                disabled={uploading || !newSpeaker.trim()}
              >
                {t('speakerEmotionDetection.add')}
              </Button>
            </div>
          </div>

          {knownSpeakers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {knownSpeakers.map((speaker) => (
                <Badge key={speaker} variant="secondary" className="gap-1">
                  {speaker}
                  <button
                    onClick={() => removeSpeaker(speaker)}
                    disabled={uploading}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Voice Cloning */}
        {!uploading && (
          <VoiceCloningUploader 
            contentType={contentType}
            onVoiceCloned={(voiceId, voiceName) => {
              console.log('Voice cloned:', voiceId, voiceName);
              toast({
                title: "Voice cloned successfully",
                description: `Voice "${voiceName}" is ready to use`
              });
            }}
          />
        )}

        <Button
          onClick={uploadVideo}
          disabled={!videoFile || !title.trim() || uploading}
          className="w-full"
          size="lg"
        >
          {uploading ? t('upload.uploading') : t('upload.uploadButton')}
        </Button>
      </CardContent>
    </Card>
  );
};
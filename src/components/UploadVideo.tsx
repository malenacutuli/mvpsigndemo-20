import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Video, X, Target, Volume2, HandMetal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
          chunkSize: 10 * 1024 * 1024,
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
    <div className="w-full space-y-6">
      <Card className="w-full border shadow-sm">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-xl font-normal flex items-center gap-2">
            <Video className="w-5 h-5" />
            Upload Video for Accessibility Processing
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* File Upload Section */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
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
                <p className="text-base text-foreground">
                  Drop your video file here or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports MP4, MOV, AVI (max 5GB)
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

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-normal">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              disabled={uploading}
              className="h-10"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-normal">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter video description (optional)"
              disabled={uploading}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Transcript Options Info Box */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-lg">📝</span>
              <div className="space-y-2 flex-1">
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Transcript Options
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  After uploading, you can either extract the transcript automatically or upload your own transcript file for editing with Captions with Intention.
                </p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Auto-extract: AI will transcribe your video with timestamps</li>
                  <li>• Upload transcript: Use your existing SRT, VTT, or TXT files with timestamps</li>
                  <li>• Edit intonation: Adjust emphasis and pitch for better accessibility</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Language and Content Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language" className="text-sm font-normal">
                Language
              </Label>
              <Select value={language} onValueChange={setLanguage} disabled={uploading}>
                <SelectTrigger id="language" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="nl">Dutch</SelectItem>
                  <SelectItem value="ru">Russian</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="ko">Korean</SelectItem>
                  <SelectItem value="zh">Chinese (Mandarin)</SelectItem>
                  <SelectItem value="ca">Catalan</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                💡 Choose the primary language spoken in your video for accurate transcription
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contentType" className="text-sm font-normal">
                Content Type
              </Label>
              <Select value={contentType} onValueChange={setContentType} disabled={uploading}>
                <SelectTrigger id="contentType" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50 max-h-[300px]">
                  <SelectItem value="education">Educational</SelectItem>
                  <SelectItem value="advertisement">Advertising</SelectItem>
                  <SelectItem value="film">Film</SelectItem>
                  <SelectItem value="branded-content">Branded Content</SelectItem>
                  <SelectItem value="webinar">Webinar</SelectItem>
                  <SelectItem value="podcast">Podcast</SelectItem>
                  <SelectItem value="social-media">Social Media</SelectItem>
                  <SelectItem value="tutorial">Tutorial</SelectItem>
                  <SelectItem value="stand-up">Stand Up</SelectItem>
                  <SelectItem value="product-demo">Product Demo</SelectItem>
                  <SelectItem value="children">Children</SelectItem>
                  <SelectItem value="music-video">Music Video</SelectItem>
                  <SelectItem value="tv-show">TV Show</SelectItem>
                  <SelectItem value="recipe">Recipe</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Speaker & Emotion Detection */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-normal">
                Speaker & Emotion Detection
              </h3>
              <p className="text-sm text-muted-foreground">
                Automatic emotion detection with optional speaker identification
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="speakers" className="text-sm font-normal">
                Known Speakers (Optional)
              </Label>
              <p className="text-sm text-muted-foreground">
                Provide names for automatic identification, or leave blank to auto-detect
              </p>
              <div className="flex gap-2">
                <Input
                  id="speakers"
                  value={newSpeaker}
                  onChange={(e) => setNewSpeaker(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSpeaker();
                    }
                  }}
                  placeholder="e.g, Sarah Chen"
                  disabled={uploading}
                  className="h-10"
                />
                <Button 
                  onClick={addSpeaker} 
                  disabled={!newSpeaker.trim() || uploading}
                  className="bg-blue-500 hover:bg-blue-600 text-white h-10 px-6"
                >
                  Add
                </Button>
              </div>

              {knownSpeakers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
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

            {/* FREE Automatic Features */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <h4 className="text-sm font-medium">FREE Automatic Features</h4>
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground pl-4">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>7-level intensity detection (whisper → screaming)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Sentiment analysis (POSITIVE/NEGATIVE/NEUTRAL)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Dynamic font sizing (smaller whispers, larger yelling)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Speaker name identification</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Character color attribution</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Upload Button */}
          <Button
            onClick={uploadVideo}
            disabled={!videoFile || !title.trim() || uploading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white h-12 text-base"
            size="lg"
          >
            {uploading ? `Uploading... ${uploadProgress}%` : 'Upload and Process Video'}
          </Button>

          {/* Processing Info */}
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>• • Your video will be automatically processed for accessibility features</p>
            <p>• • Professional captions, audio descriptions, and SL support</p>
            <p>• • Processing typically takes 2-5 minutes depending on video length</p>
          </div>
        </CardContent>
      </Card>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-6 mt-8">
        <div className="bg-card border rounded-lg p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto">
            <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-normal text-base">Smart Captions</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            AI-powered captions with emotion and intent detection for enhanced communication
          </p>
        </div>

        <div className="bg-card border rounded-lg p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto">
            <Volume2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-normal text-base">Audio Descriptions</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Professional audio descriptions timed perfectly with your content
          </p>
        </div>

        <div className="bg-card border rounded-lg p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto">
            <HandMetal className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-normal text-base">SL Support</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sign language avatars and visual accessibility features for comprehensive inclusion
          </p>
        </div>
      </div>
    </div>
  );
};

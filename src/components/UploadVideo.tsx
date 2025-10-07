import React, { useState, useCallback } from 'react';
import { Upload, Video, FileText, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { VoiceSelector } from '@/components/VoiceSelector';
import { SignLanguageAvatarSelector } from '@/components/SignLanguageAvatarSelector';
import { VoiceCloningUploader } from '@/components/VoiceCloningUploader';
import { useAuth } from '@/hooks/useAuth';
import { extractVideoFrame } from '@/lib/videoFrameExtractor';
import { Upload as TusUpload } from 'tus-js-client';
import { uploadToR2 } from '@/lib/r2Upload';

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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('auto');
  const [contentType, setContentType] = useState<string>('education');
  const [selectedVoice, setSelectedVoice] = useState('aria-engaging'); // Default to education voice
  const [selectedASL, setSelectedASL] = useState('teacher-professional'); // Default to education ASL
  const { toast } = useToast();
  const { user } = useAuth();

  // Voice libraries for audio descriptions by content type
  const voiceOptions: Record<string, Array<{ id: string; name: string; description: string; elevenLabsId: string; isCloned?: boolean }>> = {
    recipe: [
      { id: 'gordon-ramsay-style', name: 'Gordon Ramsay Style', description: 'Passionate and intense cooking narration', elevenLabsId: 'EXAVITQu4vr4xnSDxMaL' },
      { id: 'julia-child-style', name: 'Julia Child Style', description: 'Warm and encouraging cooking guidance', elevenLabsId: 'XB0fDUnXU5powFXDhCwa' },
      { id: 'anthony-bourdain-style', name: 'Anthony Bourdain Style', description: 'Sophisticated and worldly food commentary', elevenLabsId: 'onwK4e9ZLuTAKqWW03F9' },
      { id: 'custom-cloned-voice', name: 'Custom Cloned Voice', description: 'Upload your own voice sample', elevenLabsId: '', isCloned: true },
    ],
    education: [
      { id: 'david-attenborough-style', name: 'David Attenborough Style', description: 'Natural history documentary narrator', elevenLabsId: '9BWtsMINqrJLrRacOk9x' },
      { id: 'neil-degrasse-tyson-style', name: 'Neil deGrasse Tyson Style', description: 'Science communicator and astrophysicist', elevenLabsId: 'nPczCjzI2devNBz1zQrb' },
      { id: 'morgan-freeman-style', name: 'Morgan Freeman Style', description: 'Wise and authoritative narration', elevenLabsId: 'onwK4e9ZLuTAKqWW03F9' },
      { id: 'custom-cloned-voice', name: 'Custom Cloned Voice', description: 'Upload your own voice sample', elevenLabsId: '', isCloned: true },
    ],
    advertising: [
      { id: 'commercial-announcer', name: 'Commercial Announcer', description: 'Professional advertising voice', elevenLabsId: 'CwhRBWXzGAHq8TQ4Fs17' },
      { id: 'brand-storyteller', name: 'Brand Storyteller', description: 'Engaging brand narrative voice', elevenLabsId: 'EXAVITQu4vr4xnSDxMaL' },
      { id: 'luxury-narrator', name: 'Luxury Narrator', description: 'Sophisticated premium brand voice', elevenLabsId: 'onwK4e9ZLuTAKqWW03F9' },
      { id: 'custom-cloned-voice', name: 'Custom Cloned Voice', description: 'Upload your own voice sample', elevenLabsId: '', isCloned: true },
    ],
    film: [
      { id: 'epic-narrator', name: 'Epic Narrator', description: 'Cinematic trailer voice', elevenLabsId: 'TX3LPaxmHKxFdv7VOQHJ' },
      { id: 'documentary-voice', name: 'Documentary Voice', description: 'Neutral documentary narrator', elevenLabsId: '9BWtsMINqrJLrRacOk9x' },
      { id: 'character-narrator', name: 'Character Narrator', description: 'Expressive character voice', elevenLabsId: 'XB0fDUnXU5powFXDhCwa' },
      { id: 'custom-cloned-voice', name: 'Custom Cloned Voice', description: 'Upload your own voice sample', elevenLabsId: '', isCloned: true },
    ],
    'branded-content': [
      { id: 'brand-ambassador', name: 'Brand Ambassador', description: 'Authentic brand representative', elevenLabsId: 'IKne3meq5aSn9XLyUdCD' },
      { id: 'lifestyle-narrator', name: 'Lifestyle Narrator', description: 'Aspirational lifestyle voice', elevenLabsId: 'SAz9YHcvj6GT2YYXdXww' },
      { id: 'custom-cloned-voice', name: 'Custom Cloned Voice', description: 'Upload your own voice sample', elevenLabsId: '', isCloned: true },
    ],
    webinar: [
      { id: 'professional-presenter', name: 'Professional Presenter', description: 'Clear business presentation voice', elevenLabsId: 'nPczCjzI2devNBz1zQrb' },
      { id: 'expert-educator', name: 'Expert Educator', description: 'Knowledgeable instructor voice', elevenLabsId: '9BWtsMINqrJLrRacOk9x' },
      { id: 'custom-cloned-voice', name: 'Custom Cloned Voice', description: 'Upload your own voice sample', elevenLabsId: '', isCloned: true },
    ],
    podcast: [
      { id: 'podcast-host', name: 'Podcast Host', description: 'Conversational podcast voice', elevenLabsId: 'cgSgspJ2msm6clMCkdW9' },
      { id: 'storyteller', name: 'Storyteller', description: 'Engaging narrative voice', elevenLabsId: 'XB0fDUnXU5powFXDhCwa' },
      { id: 'interview-host', name: 'Interview Host', description: 'Professional interview style', elevenLabsId: 'cjVigY5qzO86Huf0OWal' },
      { id: 'custom-cloned-voice', name: 'Custom Cloned Voice', description: 'Upload your own voice sample', elevenLabsId: '', isCloned: true },
    ],
    'social-media': [
      { id: 'influencer-voice', name: 'Influencer Voice', description: 'Trendy social media narrator', elevenLabsId: 'pFZP5JQG7iQjIQuC4Bku' },
      { id: 'viral-creator', name: 'Viral Creator', description: 'Energetic content creator voice', elevenLabsId: 'IKne3meq5aSn9XLyUdCD' },
      { id: 'custom-cloned-voice', name: 'Custom Cloned Voice', description: 'Upload your own voice sample', elevenLabsId: '', isCloned: true },
    ],
    tutorial: [
      { id: 'tech-instructor', name: 'Tech Instructor', description: 'Clear technical explanation voice', elevenLabsId: 'iP95p4xoKVk53GoZ742B' },
      { id: 'friendly-teacher', name: 'Friendly Teacher', description: 'Patient tutorial guide', elevenLabsId: 'EXAVITQu4vr4xnSDxMaL' },
      { id: 'custom-cloned-voice', name: 'Custom Cloned Voice', description: 'Upload your own voice sample', elevenLabsId: '', isCloned: true },
    ],
    'stand-up': [
      { id: 'comedy-narrator', name: 'Comedy Narrator', description: 'Humorous performance voice', elevenLabsId: 'TX3LPaxmHKxFdv7VOQHJ' },
      { id: 'witty-observer', name: 'Witty Observer', description: 'Sharp comedic commentary', elevenLabsId: 'onwK4e9ZLuTAKqWW03F9' },
      { id: 'custom-cloned-voice', name: 'Custom Cloned Voice', description: 'Upload your own voice sample', elevenLabsId: '', isCloned: true },
    ],
    'product-demo': [
      { id: 'product-expert', name: 'Product Expert', description: 'Knowledgeable product voice', elevenLabsId: 'nPczCjzI2devNBz1zQrb' },
      { id: 'sales-presenter', name: 'Sales Presenter', description: 'Persuasive demonstration voice', elevenLabsId: 'CwhRBWXzGAHq8TQ4Fs17' },
      { id: 'custom-cloned-voice', name: 'Custom Cloned Voice', description: 'Upload your own voice sample', elevenLabsId: '', isCloned: true },
    ],
    children: [
      { id: 'kids-narrator', name: 'Kids Narrator', description: 'Child-friendly storyteller', elevenLabsId: 'pFZP5JQG7iQjIQuC4Bku' },
      { id: 'educational-buddy', name: 'Educational Buddy', description: 'Encouraging learning companion', elevenLabsId: 'EXAVITQu4vr4xnSDxMaL' },
      { id: 'adventure-guide', name: 'Adventure Guide', description: 'Exciting adventure narrator', elevenLabsId: 'IKne3meq5aSn9XLyUdCD' },
      { id: 'custom-cloned-voice', name: 'Custom Cloned Voice', description: 'Upload your own voice sample', elevenLabsId: '', isCloned: true },
    ],
    'music-video': [
      { id: 'music-narrator', name: 'Music Narrator', description: 'Rhythmic music commentary', elevenLabsId: 'SAz9YHcvj6GT2YYXdXww' },
      { id: 'artist-voice', name: 'Artist Voice', description: 'Creative artist perspective', elevenLabsId: 'XB0fDUnXU5powFXDhCwa' },
      { id: 'custom-cloned-voice', name: 'Custom Cloned Voice', description: 'Upload your own voice sample', elevenLabsId: '', isCloned: true },
    ],
    'tv-show': [
      { id: 'tv-announcer', name: 'TV Announcer', description: 'Professional television voice', elevenLabsId: 'onwK4e9ZLuTAKqWW03F9' },
      { id: 'show-narrator', name: 'Show Narrator', description: 'Engaging show commentary', elevenLabsId: '9BWtsMINqrJLrRacOk9x' },
      { id: 'episode-guide', name: 'Episode Guide', description: 'Episode summary narrator', elevenLabsId: 'cgSgspJ2msm6clMCkdW9' },
      { id: 'custom-cloned-voice', name: 'Custom Cloned Voice', description: 'Upload your own voice sample', elevenLabsId: '', isCloned: true },
    ]
  };

  // ASL avatar options by content type
  const aslOptions: Record<string, Array<{ id: string; name: string; description: string }>> = {
    recipe: [
      { id: 'chef-maya', name: 'Chef Maya', description: 'Professional chef with clear signing' },
      { id: 'cook-sam', name: 'Home Cook Sam', description: 'Casual and approachable cooking style' },
      { id: 'culinary-expert', name: 'Culinary Expert', description: 'Fine dining technique specialist' },
    ],
    education: [
      { id: 'teacher-alex', name: 'Teacher Alex', description: 'Professional educator with clear signing' },
      { id: 'learning-buddy', name: 'Learning Buddy', description: 'Student-friendly and engaging' },
      { id: 'professor-kim', name: 'Professor Kim', description: 'Academic subject specialist' },
    ],
    advertising: [
      { id: 'brand-ambassador', name: 'Brand Ambassador', description: 'Professional commercial presenter' },
      { id: 'product-specialist', name: 'Product Specialist', description: 'Expert product demonstrator' },
      { id: 'lifestyle-host', name: 'Lifestyle Host', description: 'Aspirational lifestyle presenter' },
    ],
    film: [
      { id: 'cinema-narrator', name: 'Cinema Narrator', description: 'Dramatic film interpreter' },
      { id: 'story-guide', name: 'Story Guide', description: 'Character and plot interpreter' },
      { id: 'scene-describer', name: 'Scene Describer', description: 'Visual action specialist' },
    ],
    'branded-content': [
      { id: 'content-host', name: 'Content Host', description: 'Branded content presenter' },
      { id: 'brand-storyteller', name: 'Brand Storyteller', description: 'Brand narrative specialist' },
    ],
    webinar: [
      { id: 'business-presenter', name: 'Business Presenter', description: 'Professional webinar host' },
      { id: 'training-facilitator', name: 'Training Facilitator', description: 'Corporate training specialist' },
      { id: 'industry-expert', name: 'Industry Expert', description: 'Subject matter specialist' },
    ],
    podcast: [
      { id: 'podcast-interpreter', name: 'Podcast Interpreter', description: 'Conversational podcast host' },
      { id: 'audio-guide', name: 'Audio Guide', description: 'Podcast content specialist' },
      { id: 'discussion-moderator', name: 'Discussion Moderator', description: 'Interview and panel specialist' },
    ],
    'social-media': [
      { id: 'social-creator', name: 'Social Creator', description: 'Trendy social media presenter' },
      { id: 'viral-host', name: 'Viral Host', description: 'Energetic content creator' },
      { id: 'influencer-guide', name: 'Influencer Guide', description: 'Social media trend specialist' },
    ],
    tutorial: [
      { id: 'tech-instructor', name: 'Tech Instructor', description: 'Technical tutorial specialist' },
      { id: 'how-to-guide', name: 'How-To Guide', description: 'Step-by-step instruction expert' },
      { id: 'skill-teacher', name: 'Skill Teacher', description: 'Practical learning facilitator' },
    ],
    'stand-up': [
      { id: 'comedy-interpreter', name: 'Comedy Interpreter', description: 'Humor and timing specialist' },
      { id: 'performance-guide', name: 'Performance Guide', description: 'Stand-up performance expert' },
    ],
    'product-demo': [
      { id: 'demo-specialist', name: 'Demo Specialist', description: 'Product demonstration expert' },
      { id: 'feature-guide', name: 'Feature Guide', description: 'Product feature specialist' },
      { id: 'sales-presenter', name: 'Sales Presenter', description: 'Sales demonstration expert' },
    ],
    children: [
      { id: 'kids-buddy', name: 'Kids Buddy', description: 'Child-friendly interpreter' },
      { id: 'story-friend', name: 'Story Friend', description: 'Children\'s storyteller' },
      { id: 'learning-pal', name: 'Learning Pal', description: 'Educational companion for kids' },
      { id: 'adventure-guide', name: 'Adventure Guide', description: 'Exciting adventure interpreter' },
    ],
    'music-video': [
      { id: 'music-interpreter', name: 'Music Interpreter', description: 'Musical performance specialist' },
      { id: 'rhythm-guide', name: 'Rhythm Guide', description: 'Beat and rhythm interpreter' },
      { id: 'artist-companion', name: 'Artist Companion', description: 'Music video content specialist' },
    ],
    'tv-show': [
      { id: 'tv-interpreter', name: 'TV Interpreter', description: 'Television content specialist' },
      { id: 'show-guide', name: 'Show Guide', description: 'TV show narrative expert' },
      { id: 'episode-host', name: 'Episode Host', description: 'Episode content presenter' },
      { id: 'series-narrator', name: 'Series Narrator', description: 'TV series storyline specialist' },
    ]
  };

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

  const uploadVideo = async () => {
    if (!videoFile || !title.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a video file and enter a title",
        variant: "destructive"
      });
      return;
    }

    // Use authenticated user ID
    const userId = user?.id;
    
    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload videos",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Create video record first with explicit typing and better error handling
      const insertData = {
        title: title.trim(),
        description: description.trim() || null,
        language,
        content_type: contentType,
        status: 'uploading' as const,
        user_id: userId
      };
      
      console.log('Creating video record...', insertData);

      const { data: video, error: videoError } = await supabase
        .from('videos')
        .insert(insertData)
        .select()
        .maybeSingle() as { data: VideoData | null, error: any };

      if (videoError || !video) {
        console.error('Database error:', videoError);
        throw videoError || new Error('Failed to create video record');
      }

      console.log('Video record created:', video);

      // CLIENT-SIDE VALIDATION FIRST (before calling edge function)
      const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
      const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];

      if (videoFile.size > MAX_FILE_SIZE) {
        throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB. Your file is ${(videoFile.size / (1024 * 1024)).toFixed(2)}MB.`);
      }

      if (!ALLOWED_TYPES.includes(videoFile.type.toLowerCase())) {
        throw new Error('Invalid file type. Allowed types: MP4, WebM, QuickTime, Matroska');
      }

      // Step 1: Get upload URL/method from hybrid upload system
      console.log('[UPLOAD] Requesting upload URL...', {
        filename: videoFile.name,
        size: videoFile.size,
        sizeMB: (videoFile.size / (1024 * 1024)).toFixed(2),
        type: videoFile.type
      });

      const { data: uploadConfig, error: uploadConfigError } = await supabase.functions.invoke('generate-upload-url', {
        body: {
          filename: videoFile.name,
          contentType: videoFile.type,
          fileSize: videoFile.size,
        }
      });

      if (uploadConfigError) {
        console.error('[UPLOAD] Failed to get upload config:', uploadConfigError);
        throw new Error(uploadConfigError.message || 'Failed to initialize upload');
      }

      console.log('[UPLOAD] Upload config received:', uploadConfig.method);

      let publicUrl = '';
      let storagePath = '';

      if (uploadConfig.method === 'presigned') {
        // PRESIGNED URL UPLOAD for files < 100MB
        console.log('[UPLOAD] Using presigned URL upload');
        
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 85); // Reserve 15% for post-processing
              setUploadProgress(percent);
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
              console.log('[UPLOAD] Presigned upload complete');
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Upload failed'));
          });

          xhr.open('PUT', uploadConfig.uploadUrl);
          xhr.setRequestHeader('Content-Type', videoFile.type);
          xhr.send(videoFile);
        });

        // Construct R2 public URL
        const endpoint = 'https://910e9ed45199083ba2001a36025dc5a4.r2.cloudflarestorage.com';
        const bucketName = 'axessvideo';
        publicUrl = `${endpoint}/${bucketName}/${uploadConfig.key}`;
        storagePath = `r2:${uploadConfig.key}`;
        
      } else {
        // MULTIPART UPLOAD for files >= 100MB
        console.log('[UPLOAD] Using multipart upload');
        
        const PART_SIZE = 10 * 1024 * 1024; // 10MB per part
        const { uploadId, key, partCount } = uploadConfig;
        const uploadedParts: Array<{ PartNumber: number; ETag: string }> = [];
        
        for (let partNumber = 1; partNumber <= partCount; partNumber++) {
          const start = (partNumber - 1) * PART_SIZE;
          const end = Math.min(start + PART_SIZE, videoFile.size);
          const chunk = videoFile.slice(start, end);
          
          // Get presigned URL for this part
          const { data: partData, error: partError } = await supabase.functions.invoke('get-r2-part-url', {
            body: { key, uploadId, partNumber },
          });

          if (partError) {
            throw new Error(`Failed to get URL for part ${partNumber}: ${partError.message}`);
          }

          // Upload the part
          const response = await fetch(partData.url, {
            method: 'PUT',
            body: chunk,
            headers: partData.headers || {},
          });

          if (!response.ok) {
            throw new Error(`Part ${partNumber} upload failed with status ${response.status}`);
          }

          const etag = response.headers.get('ETag');
          if (!etag) {
            throw new Error(`No ETag for part ${partNumber}`);
          }

          uploadedParts.push({
            PartNumber: partNumber,
            ETag: etag.replace(/"/g, ''),
          });

          const progress = Math.round((partNumber / partCount) * 85); // Reserve 15% for post-processing
          setUploadProgress(progress);
          console.log(`[UPLOAD] Part ${partNumber}/${partCount} uploaded (${progress}%)`);
        }

        // Complete multipart upload
        console.log('[UPLOAD] Completing multipart upload...');
        const { data: completeData, error: completeError } = await supabase.functions.invoke('complete-r2-upload', {
          body: { key, uploadId, parts: uploadedParts },
        });

        if (completeError) {
          throw new Error(`Failed to complete upload: ${completeError.message}`);
        }

        publicUrl = completeData.url;
        storagePath = `r2:${key}`;
        console.log('[UPLOAD] Multipart upload complete');
      }

      // Extract thumbnail
      setUploadProgress(90);
      console.log('🎬 Extracting video frame for thumbnail...');
      let thumbnailUrl: string | null = null;
      
      try {
        const extractedFrame = await extractVideoFrame(videoFile, {
          quality: 0.9,
          maxWidth: 1280,
          maxHeight: 720
        });

        const thumbnailFileName = `${video.id}-thumbnail.jpg`;
        const { data: thumbnailUpload, error: thumbnailUploadError } = await supabase.storage
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

      // Update video record
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
      
      const uploadMethod = uploadConfig.method === 'presigned' ? 'presigned URL' : 'multipart';
      toast({
        title: "Upload successful",
        description: `Your video has been uploaded successfully via ${uploadMethod}`
      });

      // Reset form
      setVideoFile(null);
      setTitle('');
      setDescription('');
      setUploadProgress(0);

      if (onUploadComplete) {
        onUploadComplete(video.id);
      }

    } catch (error) {
      console.error('Upload error:', error);
      let desc = error instanceof Error ? (error.message || 'An error occurred during upload') : 'An error occurred during upload';
      const lower = desc.toLowerCase();
      if (lower.includes('413') || lower.includes('maximum size') || lower.includes('payload too large')) {
        desc = "Your Supabase project's Storage file size limit is below this file's size. Increase it in Storage > Settings (or compress the file).";
      }
      toast({
        title: "Upload failed",
        description: desc,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          Upload Video for Accessibility Processing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Area */}
        <div
          className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => document.getElementById('video-upload')?.click()}
        >
          <input
            id="video-upload"
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          
          {videoFile ? (
            <div>
              <p className="text-sm font-medium">{videoFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium">Drop your video file here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports MP4, WebM, QuickTime, Matroska (max 500MB)
              </p>
            </div>
          )}
        </div>

        {/* Video Metadata */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter video description (optional)"
              disabled={uploading}
              rows={3}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-700 mb-2">📝 Transcript Options</h4>
            <p className="text-xs text-blue-600 mb-3">
              After uploading, you can either extract the transcript automatically or upload your own transcript file for editing with Captions with Intention.
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• <strong>Auto-extract:</strong> AI will transcribe your video with timestamps</p>
              <p>• <strong>Upload transcript:</strong> Use your existing SRT, VTT, or TXT files with timestamps</p>
              <p>• <strong>Edit intonation:</strong> Adjust emphasis and pitch for better accessibility</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={setLanguage} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect Language</SelectItem>
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
                  <SelectItem value="ar">Arabic</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="tr">Turkish</SelectItem>
                  <SelectItem value="pl">Polish</SelectItem>
                  <SelectItem value="sv">Swedish</SelectItem>
                  <SelectItem value="no">Norwegian</SelectItem>
                  <SelectItem value="da">Danish</SelectItem>
                  <SelectItem value="fi">Finnish</SelectItem>
                  <SelectItem value="cs">Czech</SelectItem>
                  <SelectItem value="hu">Hungarian</SelectItem>
                  <SelectItem value="ro">Romanian</SelectItem>
                  <SelectItem value="uk">Ukrainian</SelectItem>
                  <SelectItem value="bg">Bulgarian</SelectItem>
                  <SelectItem value="hr">Croatian</SelectItem>
                  <SelectItem value="sk">Slovak</SelectItem>
                  <SelectItem value="sl">Slovenian</SelectItem>
                  <SelectItem value="et">Estonian</SelectItem>
                  <SelectItem value="lv">Latvian</SelectItem>
                  <SelectItem value="lt">Lithuanian</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content-type">Content Type</Label>
              <Select value={contentType} onValueChange={(value: string) => {
                setContentType(value);
                // Reset voice and ASL selections when content type changes
                if (voiceOptions[value] && aslOptions[value]) {
                  setSelectedVoice(voiceOptions[value][0].id);
                  setSelectedASL(aslOptions[value][0].id);
                }
              }} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="advertising">Advertising</SelectItem>
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
                  <SelectItem value="education">Educational</SelectItem>
                  <SelectItem value="recipe">Cooking/Recipe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Voice and ASL Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              {/* Simple Voice Selection - keeping existing functionality */}
              <div>
                <Label>Voice Selection</Label>
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {(voiceOptions[contentType] || []).map(voice => (
                      <SelectItem key={voice.id} value={voice.id}>
                        {voice.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Voice Cloning Option */}
              {selectedVoice === 'custom-cloned-voice' && (
                <VoiceCloningUploader
                  contentType={contentType}
                  onVoiceCloned={(voiceId, voiceName) => {
                    // Update the voice options with the new cloned voice
                    toast({
                      title: "Voice added to library",
                      description: `${voiceName} has been added to your ${contentType} voice options`,
                    });
                  }}
                />
              )}
            </div>
            
            <SignLanguageAvatarSelector
              options={aslOptions[contentType] || []}
              selectedValue={selectedASL}
              onValueChange={setSelectedASL}
              contentType={contentType}
            />
          </div>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={uploadVideo}
          disabled={!videoFile || !title.trim() || uploading}
          className="w-full"
        >
          {uploading ? 'Uploading...' : 'Upload and Process Video'}
        </Button>

        {/* Info Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Your video will be automatically processed for accessibility features</p>
          <p>• Professional captions, audio descriptions, and ASL support</p>
          <p>• Processing typically takes 2-5 minutes depending on video length</p>
        </div>
      </CardContent>
    </Card>
  );
};
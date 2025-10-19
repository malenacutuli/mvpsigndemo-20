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

    // Use authenticated user ID or demo UUID if not authenticated
    const userId = user?.id || crypto.randomUUID();
    const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024 * 1024; // 5GB
    const S3_DIRECT_THRESHOLD = 1 * 1024 * 1024 * 1024; // 1GB - use S3 direct for files larger than this
    const isLargeFile = videoFile.size > LARGE_FILE_THRESHOLD;
    const useS3Direct = videoFile.size > S3_DIRECT_THRESHOLD && videoFile.size <= LARGE_FILE_THRESHOLD;

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

      let storagePath = '';
      let publicUrl = '';

      if (useS3Direct) {
        // Use S3 direct multipart upload for files 1GB-5GB
        console.log('Using S3 direct multipart upload');
        console.log('File details:', {
          name: videoFile.name,
          size: videoFile.size,
          sizeGB: (videoFile.size / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
          type: videoFile.type
        });
        
        toast({
          title: "Large file detected",
          description: "Using optimized S3 direct upload...",
        });

        try {
          // Ensure auth token for function call
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData.session?.access_token;
          if (!accessToken) {
            throw new Error('You must be signed in to upload via S3.');
          }
          // Step 1: Initiate multipart upload
          const { data: initData, error: initError } = await supabase.functions.invoke('s3-multipart-upload', {
            body: {
              action: 'initiate',
              fileName: videoFile.name,
              fileSize: videoFile.size,
            },
            headers: {
              authorization: `Bearer ${accessToken}`,
            },
          });

          if (initError || !initData?.uploadId) {
            throw new Error('Failed to initiate S3 upload');
          }

          const { uploadId, key } = initData;
          console.log('S3 upload initiated:', { uploadId, key });

          // Step 2: Get presigned URLs for all parts
          const { data: urlsData, error: urlsError } = await supabase.functions.invoke('s3-multipart-upload', {
            body: {
              action: 'getPresignedUrls',
              uploadId,
              key,
              fileSize: videoFile.size,
            },
            headers: {
              authorization: `Bearer ${accessToken}`,
            },
          });

          if (urlsError || !urlsData?.presignedUrls) {
            throw new Error('Failed to get presigned URLs');
          }

          const { presignedUrls } = urlsData;
          console.log(`Got ${presignedUrls.length} presigned URLs`);

          // Step 3: Upload parts with concurrency control
          const PART_SIZE = 10 * 1024 * 1024; // 10MB
          const MAX_CONCURRENT = 10;
          const uploadedParts: Array<{ PartNumber: number; ETag: string }> = [];
          
          let uploadedBytes = 0;
          const totalBytes = videoFile.size;

          const uploadPart = async (partInfo: { partNumber: number; url: string }) => {
            const start = (partInfo.partNumber - 1) * PART_SIZE;
            const end = Math.min(start + PART_SIZE, videoFile.size);
            const chunk = videoFile.slice(start, end);

            const response = await fetch(partInfo.url, {
              method: 'PUT',
              body: chunk,
              headers: {
                'Content-Type': 'application/octet-stream',
              },
            });

            if (!response.ok) {
              throw new Error(`Failed to upload part ${partInfo.partNumber}`);
            }

            const etag = response.headers.get('ETag');
            if (!etag) {
              throw new Error(`No ETag received for part ${partInfo.partNumber}`);
            }

            uploadedBytes += chunk.size;
            const progress = Math.round((uploadedBytes / totalBytes) * 90); // Reserve 10% for finalization
            setUploadProgress(progress);
            console.log(`Part ${partInfo.partNumber} uploaded (${progress}%)`);

            return {
              PartNumber: partInfo.partNumber,
              ETag: etag.replace(/"/g, ''), // Remove quotes
            };
          };

          // Upload parts with concurrency control
          for (let i = 0; i < presignedUrls.length; i += MAX_CONCURRENT) {
            const batch = presignedUrls.slice(i, i + MAX_CONCURRENT);
            const results = await Promise.all(batch.map(uploadPart));
            uploadedParts.push(...results);
          }

          // Sort parts by part number
          uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber);

          // Step 4: Complete multipart upload
          setUploadProgress(90);
          const { data: completeData, error: completeError } = await supabase.functions.invoke('s3-multipart-upload', {
            body: {
              action: 'complete',
              uploadId,
              key,
              parts: uploadedParts,
            },
            headers: {
              authorization: `Bearer ${accessToken}`,
            },
          });

          if (completeError || !completeData?.url) {
            throw new Error('Failed to complete S3 upload');
          }

          publicUrl = completeData.url;
          storagePath = `s3:${publicUrl}`;
          console.log('S3 direct upload complete:', publicUrl);
          
          // Update video record immediately
          setUploadProgress(95);
          const { error: updateError } = await supabase
            .from('videos')
            .update({
              storage_path: storagePath,
              status: 'uploaded' as const,
            })
            .eq('id', video.id);

          if (updateError) throw updateError;
          
          setUploadProgress(100);
          toast({
            title: "Upload successful",
            description: "Your video has been uploaded successfully"
          });
          
          // Extract thumbnail in background (non-blocking)
          extractVideoFrame(videoFile, {
            quality: 0.9,
            maxWidth: 1280,
            maxHeight: 720
          }).then(async (extractedFrame) => {
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
              
              await supabase
                .from('videos')
                .update({ thumbnail_url: thumbUrl })
                .eq('id', video.id);
              
              console.log('✅ Thumbnail uploaded:', thumbUrl);
            }
          }).catch((err) => console.warn('⚠️ Thumbnail upload failed:', err));
          
        } catch (error) {
          console.error('S3 direct upload failed:', error);
          throw new Error('Failed to upload file via S3. Please try again.');
        }
      } else if (isLargeFile) {
        // Use R2 for large files (>5GB)
        console.log('Using R2 for large file upload');
        console.log('File details:', {
          name: videoFile.name,
          size: videoFile.size,
          sizeGB: (videoFile.size / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
          type: videoFile.type
        });
        
        toast({
          title: "Large file detected",
          description: "Using optimized upload for large files...",
        });

        try {
          const result = await uploadToR2(videoFile, (progress) => {
            console.log('Upload progress:', progress + '%');
            setUploadProgress(progress * 0.9); // Reserve 10% for thumbnail
          });
          
          if (!result.success) {
            console.error('R2 upload failed:', result.error);
            throw new Error(result.error || 'Upload failed');
          }
          
          publicUrl = result.url!;
          storagePath = `r2:${publicUrl}`;
          console.log('R2 upload complete:', publicUrl);
          
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
          toast({
            title: "Upload successful",
            description: "Your large video has been uploaded successfully"
          });
          
        } catch (error) {
          console.error('R2 upload failed:', error);
          throw new Error('Failed to upload large file. Please try again.');
        }
      } else {
        // Use Supabase Storage with TUS for smaller files (<5GB)
        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${video.id}.${fileExt}`;
        
        console.log('Uploading file to Supabase Storage...');
        
        // For files larger than 6MB, use resumable upload
        let uploadData, uploadError;
        
        if (videoFile.size > 6 * 1024 * 1024) { // 6MB threshold
        console.log('Using resumable upload for large file...');
        
        // Use Supabase Storage TUS (resumable) upload for large files
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) {
          throw new Error('You must be signed in to upload large files.');
        }

        const endpoint = `https://faeyekynudyzeotbjfsj.storage.supabase.co/storage/v1/upload/resumable`;
        const objectPath = `originals/${fileName}`;

        await new Promise<void>((resolve, reject) => {
          const upload = new TusUpload(videoFile, {
            endpoint,
            retryDelays: [0, 1000, 3000, 5000, 10000, 20000],
            headers: {
              authorization: `Bearer ${accessToken}`,
              'x-upsert': 'false',
            },
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            metadata: {
              bucketName: 'videos',
              objectName: objectPath,
              contentType: videoFile.type || 'video/mp4',
              cacheControl: '3600',
            },
            chunkSize: 6 * 1024 * 1024, // 6MB chunks as required by Supabase TUS
            onError: (err) => {
              console.error('Resumable upload error:', err);
              reject(err);
            },
            onProgress: (bytesUploaded, bytesTotal) => {
              const pct = Math.min(60, Math.round((bytesUploaded / bytesTotal) * 60)); // cap at 60% until post-processing
              setUploadProgress(pct);
            },
            onSuccess: () => {
              console.log('Resumable upload completed.');
              resolve();
            },
          });

          upload.findPreviousUploads().then((previous) => {
            if (previous.length) {
              upload.resumeFromPreviousUpload(previous[0]);
            }
            upload.start();
          });
        });

        // Mimic Supabase upload response
        uploadData = { path: objectPath } as any;
        uploadError = null;
      } else {
        console.log('Using standard upload for small file...');
        
        // Use standard upload for small files
        const { data, error } = await supabase.storage
          .from('videos')
          .upload(`originals/${fileName}`, videoFile, {
            contentType: videoFile.type,
            upsert: false
          });
          
        uploadData = data;
        uploadError = error;
      }

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully:', uploadData);

      // Update database status IMMEDIATELY after upload - don't wait for thumbnail
      setUploadProgress(75);
      console.log('✅ File uploaded successfully to storage');

      const { error: updateError } = await supabase
        .from('videos')
        .update({
          storage_path: uploadData.path,
          status: 'uploaded' as const,
          updated_at: new Date().toISOString()
        })
        .eq('id', video.id);

      if (updateError) {
        console.error('Failed to update video status:', updateError);
        throw updateError;
      }

      setUploadProgress(90);
      console.log('✅ Database updated - video ready to use');

      // Extract thumbnail in background - non-blocking
      console.log('🎬 Starting background thumbnail extraction...');
      extractThumbnailInBackground(videoFile, video.id, supabase).catch(err => {
        console.warn('Background thumbnail extraction failed (non-critical):', err);
      });

      setUploadProgress(100);
      console.log('✅ Upload complete! You can start editing now.');


      toast({
        title: "Upload successful",
        description: "Your video has been uploaded successfully and is ready to edit"
      });
      } // Close the else block for Supabase Storage

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
                Supports MP4, MOV, AVI (max 5GB)
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

/**
 * Extract video thumbnail in background without blocking UI
 * This runs asynchronously after upload completes
 */
async function extractThumbnailInBackground(
  videoFile: File,
  videoId: string,
  supabase: any
): Promise<void> {
  const startTime = Date.now();
  
  try {
    console.log(`🎬 [Background] Starting thumbnail extraction for video ${videoId}`);
    
    // Extract frame at 2 seconds into video
    const extractedFrame = await extractVideoFrame(videoFile, {
      quality: 0.85,
      maxWidth: 1280,
      maxHeight: 720,
      timeInSeconds: 2.0
    });
    
    if (!extractedFrame) {
      console.warn('[Background] No frame could be extracted');
      return;
    }
    
    const extractTime = Date.now() - startTime;
    console.log(`✅ [Background] Frame extracted in ${(extractTime / 1000).toFixed(1)}s`);
    
    // Convert to blob
    const thumbnailBlob = extractedFrame.blob;
    const thumbnailPath = `${videoId}-thumbnail.jpg`;
    
    console.log(`⬆️ [Background] Uploading thumbnail (${(thumbnailBlob.size / 1024).toFixed(0)} KB)`);
    
    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('thumbnails')
      .upload(thumbnailPath, thumbnailBlob, {
        upsert: true,
        contentType: 'image/jpeg',
        cacheControl: '3600'
      });
      
    if (uploadError) {
      console.error('[Background] Thumbnail upload failed:', uploadError);
      return;
    }
    
    const uploadTime = Date.now() - startTime;
    console.log(`✅ [Background] Thumbnail uploaded in ${(uploadTime / 1000).toFixed(1)}s`);
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('thumbnails')
      .getPublicUrl(thumbnailPath);
    
    // Update video record with thumbnail URL
    const { error: updateError } = await supabase
      .from('videos')
      .update({
        thumbnail_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', videoId);
      
    if (updateError) {
      console.error('[Background] Failed to save thumbnail URL:', updateError);
      return;
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ [Background] Thumbnail complete in ${(totalTime / 1000).toFixed(1)}s total`);
    
  } catch (error) {
    const failTime = Date.now() - startTime;
    console.error(`❌ [Background] Thumbnail failed after ${(failTime / 1000).toFixed(1)}s:`, error);
    // Don't throw - this is a non-critical background operation
  }
}
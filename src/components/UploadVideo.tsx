import React, { useState, useCallback } from 'react';
import { Upload, Video, FileText, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { VoiceSelector } from '@/components/VoiceSelector';
import { ASLAvatarSelector } from '@/components/ASLAvatarSelector';

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
  const [language, setLanguage] = useState('en');
  const [contentType, setContentType] = useState<'recipe' | 'education'>('education');
  const [selectedVoice, setSelectedVoice] = useState('sarah-warm');
  const [selectedASL, setSelectedASL] = useState('chef-friendly');
  const { toast } = useToast();

  // Voice options for audio descriptions
  const voiceOptions = {
    recipe: [
      { id: 'sarah-warm', name: 'Sarah', description: 'Warm and friendly for cooking shows', elevenLabsId: 'EXAVITQu4vr4xnSDxMaL' },
      { id: 'brian-clear', name: 'Brian', description: 'Clear and precise instructions', elevenLabsId: 'nPczCjzI2devNBz1zQrb' },
    ],
    education: [
      { id: 'aria-engaging', name: 'Aria', description: 'Engaging and educational', elevenLabsId: '9BWtsMINqrJLrRacOk9x' },
      { id: 'charlotte-gentle', name: 'Charlotte', description: 'Gentle and nurturing for children', elevenLabsId: 'XB0fDUnXU5powFXDhCwa' },
    ]
  };

  // ASL avatar options
  const aslOptions = {
    recipe: [
      { id: 'chef-friendly', name: 'Chef Maya', description: 'Professional chef with clear signing' },
      { id: 'cook-casual', name: 'Home Cook Sam', description: 'Casual and approachable cooking style' },
    ],
    education: [
      { id: 'teacher-professional', name: 'Teacher Alex', description: 'Professional educator with clear signing' },
      { id: 'student-friendly', name: 'Learning Buddy', description: 'Student-friendly and engaging' },
    ]
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  }, [title]);

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

    try {
      setUploading(true);
      setUploadProgress(0);

      // Create video record first with explicit typing
      const insertData = {
        title: title.trim(),
        description: description.trim() || null,
        language,
        content_type: contentType,
        status: 'uploading' as const,
        user_id: crypto.randomUUID() // Generate a UUID for demo purposes
      };

      const { data: video, error: videoError } = await supabase
        .from('videos')
        .insert(insertData)
        .select()
        .maybeSingle() as { data: VideoData | null, error: any };

      if (videoError || !video) {
        throw videoError || new Error('Failed to create video record');
      }

      // Upload video file to storage
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${video.id}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(`originals/${fileName}`, videoFile, {
          contentType: videoFile.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Update video record with storage path
      const { error: updateError } = await supabase
        .from('videos')
        .update({
          storage_path: uploadData.path,
          status: 'uploaded' as const
        })
        .eq('id', video.id);

      if (updateError) throw updateError;

      toast({
        title: "Upload successful",
        description: "Your video has been uploaded and is being processed"
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
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
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
                Supports MP4, MOV, AVI (max 500MB)
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={setLanguage} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content-type">Content Type</Label>
              <Select value={contentType} onValueChange={(value: 'recipe' | 'education') => {
                setContentType(value);
                // Reset voice and ASL selections when content type changes
                setSelectedVoice(voiceOptions[value][0].id);
                setSelectedASL(aslOptions[value][0].id);
              }} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="education">Educational</SelectItem>
                  <SelectItem value="recipe">Cooking/Recipe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Voice and ASL Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <VoiceSelector
              options={voiceOptions[contentType]}
              selectedValue={selectedVoice}
              onValueChange={setSelectedVoice}
              contentType={contentType}
            />
            
            <ASLAvatarSelector
              options={aslOptions[contentType]}
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
          <p>• Generated captions, audio descriptions, and ASL support</p>
          <p>• Processing typically takes 2-5 minutes depending on video length</p>
        </div>
      </CardContent>
    </Card>
  );
};
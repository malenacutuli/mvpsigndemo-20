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
import { VoiceCloningUploader } from '@/components/VoiceCloningUploader';
import { useAuth } from '@/hooks/useAuth';

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

    // Use authenticated user ID or demo UUID if not authenticated
    const userId = user?.id || crypto.randomUUID();

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

      // Upload video file to storage
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${video.id}.${fileExt}`;
      
      console.log('Uploading file to storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(`originals/${fileName}`, videoFile, {
          contentType: videoFile.type,
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully:', uploadData);

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
              <VoiceSelector
                options={voiceOptions[contentType] || []}
                selectedValue={selectedVoice}
                onValueChange={setSelectedVoice}
                contentType={contentType}
              />
              
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
            
            <ASLAvatarSelector
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
          <p>• Generated captions, audio descriptions, and ASL support</p>
          <p>• Processing typically takes 2-5 minutes depending on video length</p>
        </div>
      </CardContent>
    </Card>
  );
};
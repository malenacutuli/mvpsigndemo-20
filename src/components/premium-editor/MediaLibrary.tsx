import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ThumbnailGenerator } from '@/components/ThumbnailGenerator';
import { ASLClipUploader } from '@/components/ASLClipUploader';
import { 
  Search, Upload, Image, Video, Music, Sparkles, 
  Wand2, Play, Loader2, Download, RefreshCw, Plus 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MediaLibraryProps {
  videoId: string;
  onMediaSelect: (media: MediaAsset) => void;
}

interface MediaAsset {
  id: string;
  type: 'video' | 'image' | 'audio' | 'gif';
  url: string;
  thumbnail?: string;
  title: string;
  duration?: number;
  source: 'stock' | 'user' | 'ai';
  provider?: 'pexels' | 'unsplash' | 'giphy' | 'runway' | 'gemini' | 'user';
}

interface AIGenerationTask {
  id: string;
  type?: 'image' | 'video';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  prompt: string;
  model: string;
  output?: string;
  error?: string;
  createdAt: string;
}

export function MediaLibrary({ videoId, onMediaSelect }: MediaLibraryProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [stockVideos, setStockVideos] = useState<MediaAsset[]>([]);
  const [stockImages, setStockImages] = useState<MediaAsset[]>([]);
  const [stockGifs, setStockGifs] = useState<MediaAsset[]>([]);
  const [userMedia, setUserMedia] = useState<MediaAsset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // AI Generation state
  const [aiGenerationTasks, setAiGenerationTasks] = useState<AIGenerationTask[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerationType, setAiGenerationType] = useState<'image' | 'video'>('image');
  const [aiModel, setAiModel] = useState('gen4_image_turbo');
  const [aiReferenceImage, setAiReferenceImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // AI Generation Models
  const AI_MODELS = {
    image: [
      { id: 'gen4_image_turbo', name: 'Runway Gen-4 Image Turbo', provider: 'runway', speed: 'fast' },
      { id: 'gen4_image', name: 'Runway Gen-4 Image', provider: 'runway', speed: 'medium' },
      { id: 'gemini_2.5_flash', name: 'Gemini 2.5 Flash', provider: 'gemini', speed: 'fast' },
    ],
    video: [
      { id: 'gen4_turbo', name: 'Runway Gen-4 Turbo', provider: 'runway', speed: 'fast', maxDuration: 10 },
      { id: 'veo3.1', name: 'Google VEO 3.1', provider: 'gemini', speed: 'medium', maxDuration: 8 },
      { id: 'veo3.1_fast', name: 'Google VEO 3.1 Fast', provider: 'gemini', speed: 'fast', maxDuration: 4 },
    ]
  };

  // Load user media on mount
  useEffect(() => {
    loadUserMedia();
    loadAIGenerationTasks();
  }, [videoId]);

  // === STOCK MEDIA SEARCH ===
  
  const searchStockVideos = async (query: string) => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-pexels-videos', {
        body: { query, perPage: 20 }
      });

      if (error) throw error;

      const videos: MediaAsset[] = data.videos.map((v: any) => ({
        id: v.id.toString(),
        type: 'video',
        url: v.video_files[0].link,
        thumbnail: v.image,
        title: query,
        duration: v.duration,
        source: 'stock',
        provider: 'pexels'
      }));

      setStockVideos(videos);
    } catch (error) {
      console.error('Pexels search failed:', error);
      toast.error('Failed to search videos');
    } finally {
      setIsSearching(false);
    }
  };

  const searchStockImages = async (query: string) => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-unsplash-images', {
        body: { query, perPage: 30 }
      });

      if (error) throw error;

      const images: MediaAsset[] = data.results.map((img: any) => ({
        id: img.id,
        type: 'image',
        url: img.urls.regular,
        thumbnail: img.urls.small,
        title: img.alt_description || query,
        source: 'stock',
        provider: 'unsplash'
      }));

      setStockImages(images);
    } catch (error) {
      console.error('Unsplash search failed:', error);
      toast.error('Failed to search images');
    } finally {
      setIsSearching(false);
    }
  };

  const searchGifs = async (query: string) => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-giphy', {
        body: { query, limit: 30 }
      });

      if (error) throw error;

      const gifs: MediaAsset[] = data.data.map((gif: any) => ({
        id: gif.id,
        type: 'gif',
        url: gif.images.original.url,
        thumbnail: gif.images.fixed_height_small.url,
        title: gif.title,
        source: 'stock',
        provider: 'giphy'
      }));

      setStockGifs(gifs);
    } catch (error) {
      console.error('GIPHY search failed:', error);
      toast.error('Failed to search GIFs');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    searchStockVideos(searchQuery);
    searchStockImages(searchQuery);
    searchGifs(searchQuery);
  };

  // === AI GENERATION ===
  
  const generateAIMedia = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    
    try {
      const model = AI_MODELS[aiGenerationType].find(m => m.id === aiModel);
      
      if (model?.provider === 'runway') {
        await generateWithRunway();
      } else if (model?.provider === 'gemini') {
        await generateWithGemini();
      }
    } catch (error) {
      console.error('AI generation failed:', error);
      toast.error('Failed to generate media');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateWithRunway = async () => {
    const taskId = crypto.randomUUID();
    
    // Add task to state immediately
    setAiGenerationTasks(prev => [...prev, {
      id: taskId,
      prompt: aiPrompt,
      model: aiModel,
      status: 'queued',
      createdAt: new Date().toISOString()
    }]);

    try {
      toast.info('Starting AI video generation...');

      // Call Runway ML edge function
      const { data, error } = await supabase.functions.invoke('prompt-to-video', {
        body: {
          action: 'start',
          prompt: aiPrompt
        }
      });

      if (error) throw error;

      // Start polling for status
      pollGenerationStatus(taskId, data.id);

    } catch (error: any) {
      console.error('Generation failed:', error);
      toast.error('Failed to start generation');
      
      // Update task status
      setAiGenerationTasks(prev =>
        prev.map(t => t.id === taskId
          ? { ...t, status: 'failed', error: error.message }
          : t
        )
      );
    }
  };

  const pollGenerationStatus = async (taskId: string, runwayTaskId: string) => {
    const maxAttempts = 120; // 10 minutes (5s intervals)
    let attempts = 0;

    const poll = async (): Promise<void> => {
      try {
        attempts++;

        // Check status via edge function
        const { data, error } = await supabase.functions.invoke('prompt-to-video', {
          body: {
            action: 'status',
            id: runwayTaskId
          }
        });

        if (error) throw error;

        console.log(`Poll attempt ${attempts}: Status = ${data.status}`);

        // Update task in state
        setAiGenerationTasks(prev =>
          prev.map(t => t.id === taskId
            ? { 
                ...t, 
                status: data.status === 'succeeded' ? 'completed' : 
                        data.status === 'failed' ? 'failed' : 
                        data.status === 'processing' ? 'processing' : 'queued',
                progress: data.status === 'processing' ? 50 : 
                         data.status === 'succeeded' ? 100 : undefined,
                output: data.videoUrl 
              }
            : t
          )
        );

        if (data.status === 'succeeded' && data.videoUrl) {
          // Add to media library
          const promptText = aiGenerationTasks.find(t => t.id === taskId)?.prompt || 'AI Generated Video';
          const newAsset: MediaAsset = {
            id: crypto.randomUUID(),
            type: 'video',
            url: data.videoUrl,
            thumbnail: data.videoUrl,
            title: promptText,
            source: 'ai',
            provider: 'runway'
          };
          
          setUserMedia(prev => [newAsset, ...prev]);
          toast.success('✨ Video generated successfully!', {
            description: 'Added to your media library',
            duration: 5000
          });
          return;
        }

        if (data.status === 'failed') {
          toast.error('Generation failed', {
            description: data.error || 'Unknown error'
          });
          return;
        }

        // Continue polling if not complete
        if (attempts < maxAttempts && ['queued', 'processing'].includes(data.status)) {
          setTimeout(() => poll(), 5000);
        } else if (attempts >= maxAttempts) {
          toast.error('Generation timeout', {
            description: 'Check Runway dashboard for status'
          });
        }

      } catch (error) {
        console.error('Polling error:', error);
        if (attempts < maxAttempts) {
          setTimeout(() => poll(), 5000);
        }
      }
    };

    // Start polling
    poll();
  };

  const generateWithGemini = async () => {
    const { data, error } = await supabase.functions.invoke('gemini-generate', {
      body: {
        type: aiGenerationType,
        model: aiModel,
        prompt: aiPrompt,
        videoId: videoId
      }
    });

    if (error) throw error;

    const task: AIGenerationTask = {
      id: data.taskId,
      type: aiGenerationType,
      status: 'completed',
      progress: 100,
      prompt: aiPrompt,
      model: aiModel,
      output: data.output,
      createdAt: new Date().toISOString()
    };

    setAiGenerationTasks(prev => [task, ...prev]);
    
    // Add to user media
    const newMedia: MediaAsset = {
      id: data.taskId,
      type: aiGenerationType,
      url: data.output,
      thumbnail: data.output,
      title: aiPrompt,
      source: 'ai',
      provider: 'gemini'
    };
    
    setUserMedia(prev => [newMedia, ...prev]);
    toast.success('AI media generated!');
  };

  const loadUserMedia = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { data, error } = await supabase
        .from('media_library')
        .select('*')
        .eq('user_id', session.session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const media: MediaAsset[] = (data || []).map(m => ({
        id: m.id,
        type: m.media_type as 'video' | 'image' | 'audio' | 'gif',
        url: m.file_url,
        thumbnail: m.thumbnail_url || undefined,
        title: m.name,
        duration: m.duration_seconds || undefined,
        source: m.is_stock ? 'stock' : 'user'
      }));

      setUserMedia(media);
    } catch (error) {
      console.error('Failed to load user media:', error);
    }
  };

  const loadAIGenerationTasks = async () => {
    // AI generation tasks will be stored locally for now
    // In production, these would be stored in a dedicated table
    try {
      const storedTasks = localStorage.getItem(`ai_tasks_${videoId}`);
      if (storedTasks) {
        const tasks = JSON.parse(storedTasks);
        setAiGenerationTasks(tasks);
      }
    } catch (error) {
      console.error('Failed to load AI tasks:', error);
    }
  };

  // RENDER
  return (
    <div className="h-full flex flex-col bg-background">
      <Tabs defaultValue="stock" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b rounded-none px-4">
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="ai-generate">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Generate
          </TabsTrigger>
          <TabsTrigger value="brand">Brand</TabsTrigger>
          <TabsTrigger value="uploads">Uploads</TabsTrigger>
        </TabsList>

        {/* STOCK TAB */}
        <TabsContent value="stock" className="flex-1 flex flex-col m-0">
          {/* Search Bar */}
          <div className="p-4 border-b border-border">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search stock media..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* Stock Videos */}
              {stockVideos.length > 0 && (
                <MediaGrid
                  title="Videos"
                  icon={Video}
                  items={stockVideos}
                  onSelect={onMediaSelect}
                />
              )}

              {/* Stock Images */}
              {stockImages.length > 0 && (
                <MediaGrid
                  title="Images"
                  icon={Image}
                  items={stockImages}
                  onSelect={onMediaSelect}
                />
              )}

              {/* GIFs */}
              {stockGifs.length > 0 && (
                <MediaGrid
                  title="GIPHY GIFs"
                  icon={Sparkles}
                  items={stockGifs}
                  onSelect={onMediaSelect}
                />
              )}

              {/* Empty state */}
              {!isSearching && stockVideos.length === 0 && stockImages.length === 0 && stockGifs.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Search for stock videos, images, or GIFs
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* AI GENERATE TAB */}
        <TabsContent value="ai-generate" className="flex-1 flex flex-col m-0">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* Generation Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wand2 className="w-5 h-5" />
                    Generate AI Media
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Type Selection */}
                  <div className="flex gap-2">
                    <Button
                      variant={aiGenerationType === 'image' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => {
                        setAiGenerationType('image');
                        setAiModel('gen4_image_turbo');
                      }}
                    >
                      <Image className="w-4 h-4 mr-2" />
                      Image
                    </Button>
                    <Button
                      variant={aiGenerationType === 'video' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => {
                        setAiGenerationType('video');
                        setAiModel('gen4_turbo');
                      }}
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Video
                    </Button>
                  </div>

                  {/* Model Selection */}
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Select value={aiModel} onValueChange={setAiModel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_MODELS[aiGenerationType].map(model => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center gap-2">
                              <span>{model.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {model.speed}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Prompt Input */}
                  <div className="space-y-2">
                    <Label>Prompt</Label>
                    <Textarea
                      placeholder={`Describe the ${aiGenerationType} you want to generate...`}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      {aiPrompt.length} / 1000 characters
                    </p>
                  </div>

                  {/* Reference Image (optional) */}
                  <div className="space-y-2">
                    <Label>Reference Image (Optional)</Label>
                    <Input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={aiReferenceImage || ''}
                      onChange={(e) => setAiReferenceImage(e.target.value)}
                    />
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={generateAIMedia}
                    disabled={isGenerating || !aiPrompt.trim()}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate {aiGenerationType}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Active Generation Tasks */}
              {aiGenerationTasks.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Active Generations</h3>
                  {aiGenerationTasks.map(task => (
                    <Card key={task.id} className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.prompt}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={
                              task.status === 'completed' ? 'default' :
                              task.status === 'failed' ? 'destructive' :
                              'secondary'
                            }>
                              {task.status}
                            </Badge>
                            {task.progress && (
                              <span className="text-xs text-muted-foreground">
                                {task.progress}%
                              </span>
                            )}
                          </div>
                          {task.status === 'processing' && task.progress && (
                            <Progress value={task.progress} className="h-1 mt-2" />
                          )}
                        </div>
                        {task.status === 'completed' && task.output && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const asset: MediaAsset = {
                                id: task.id,
                                type: task.type || 'video',
                                url: task.output!,
                                thumbnail: task.output!,
                                title: task.prompt,
                                source: 'ai',
                                provider: 'runway'
                              };
                              onMediaSelect(asset);
                              toast.success('Added to timeline');
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* BRAND TAB */}
        <TabsContent value="brand" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Video Thumbnails</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Generate thumbnails for your videos
                </p>
                <Button variant="outline" className="w-full">
                  <Image className="w-4 h-4 mr-2" />
                  Generate Thumbnail
                </Button>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Sign Language Clips</h3>
                <ASLClipUploader
                  onClipsUploaded={(clips) => {
                    toast.success(`${clips.length} ASL clips uploaded`);
                    loadUserMedia();
                  }}
                />
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* UPLOADS TAB */}
        <TabsContent value="uploads" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {userMedia.length > 0 ? (
                <MediaGrid
                  title="Your Uploads"
                  icon={Upload}
                  items={userMedia}
                  onSelect={onMediaSelect}
                />
              ) : (
                <div className="text-center py-12">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No uploads yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper Component: MediaGrid
function MediaGrid({ 
  title, 
  icon: Icon, 
  items, 
  onSelect 
}: { 
  title: string; 
  icon: any; 
  items: MediaAsset[]; 
  onSelect: (media: MediaAsset) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </h3>
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((media) => (
          <button
            key={media.id}
            onClick={() => onSelect(media)}
            className="relative aspect-video rounded-lg overflow-hidden border border-border hover:border-primary transition-all group"
          >
            <img
              src={media.thumbnail || media.url}
              alt={media.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
              <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {media.duration && (
              <Badge className="absolute bottom-2 right-2 text-xs">
                {Math.floor(media.duration)}s
              </Badge>
            )}
            {media.source === 'ai' && (
              <Badge className="absolute top-2 left-2 text-xs" variant="secondary">
                <Sparkles className="w-3 h-3 mr-1" />
                AI
              </Badge>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

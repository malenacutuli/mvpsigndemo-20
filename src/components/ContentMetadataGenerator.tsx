import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  Loader2, 
  Copy, 
  Download,
  Youtube,
  Instagram,
  Music,
  Linkedin,
  Check
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ContentMetadataGeneratorProps {
  video: any;
}

const platforms = [
  {
    key: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    color: 'text-red-500',
    types: ['description', 'title', 'tags']
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    icon: Music,
    color: 'text-foreground',
    types: ['caption', 'hashtags']
  },
  {
    key: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'text-pink-500',
    types: ['caption', 'hashtags']
  },
  {
    key: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'text-blue-600',
    types: ['post', 'article']
  }
];

export const ContentMetadataGenerator: React.FC<ContentMetadataGeneratorProps> = ({ video }) => {
  const [selectedPlatform, setSelectedPlatform] = useState('youtube');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [savedHistory, setSavedHistory] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedPlatformConfig = platforms.find(p => p.key === selectedPlatform)!;

  useEffect(() => {
    loadSavedContent();
  }, [video.id, selectedPlatform]);

  const loadSavedContent = async () => {
    const { data, error } = await supabase
      .from('generated_metadata')
      .select('*')
      .eq('video_id', video.id)
      .eq('type', selectedPlatform)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setSavedHistory(data);
    }
  };

  const generateContent = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-content-metadata', {
        body: {
          videoId: video.id,
          type: selectedPlatform
        }
      });

      if (error) throw error;

      setGeneratedContent(data.content);
      toast.success(`${selectedPlatformConfig.name} content generated!`);
      await loadSavedContent();

      // Track usage
      await supabase.from('feature_usage').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        feature_name: 'content_metadata_generation',
        video_id: video.id,
        metadata: { platform: selectedPlatform }
      });
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error('Failed to generate content', {
        description: error.message
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (content: string, id?: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Copied to clipboard!');
      if (id) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleDownload = (content: string, platform: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${video.title.slice(0, 30)}_${platform}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Content Metadata Generator
        </CardTitle>
        <CardDescription>
          Generate optimized titles, descriptions, and captions for social platforms
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Platform Tabs */}
        <Tabs value={selectedPlatform} onValueChange={setSelectedPlatform}>
          <TabsList className="grid w-full grid-cols-4">
            {platforms.map((platform) => {
              const Icon = platform.icon;
              return (
                <TabsTrigger 
                  key={platform.key} 
                  value={platform.key}
                  className="gap-2"
                >
                  <Icon className={cn("w-4 h-4", platform.color)} />
                  <span className="hidden sm:inline">{platform.name}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {platforms.map((platform) => (
            <TabsContent key={platform.key} value={platform.key} className="space-y-4 mt-4">
              {/* Generate Section */}
              <Card className="border-dashed">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      {platform.icon && <platform.icon className={cn("w-8 h-8", platform.color)} />}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Generate {platform.name} Content</h3>
                      <p className="text-sm text-muted-foreground">
                        Create optimized {platform.types.join(', ')} for this video
                      </p>
                    </div>
                    <Button 
                      onClick={generateContent}
                      disabled={isGenerating}
                      size="lg"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Content
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Generated Content */}
              {generatedContent && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Latest Generated Content</CardTitle>
                      <Badge variant="secondary">Just now</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {generatedContent}
                      </pre>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCopy(generatedContent)}
                        className="flex-1"
                      >
                        <Copy className="w-3 h-3 mr-2" />
                        Copy
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownload(generatedContent, platform.key)}
                        className="flex-1"
                      >
                        <Download className="w-3 h-3 mr-2" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* History */}
              {savedHistory.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground">
                    Previous Versions ({savedHistory.length})
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {savedHistory.map((item) => (
                      <Card key={item.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-xs text-muted-foreground">
                                {formatDate(item.created_at)}
                              </div>
                              {item.metadata?.model && (
                                <Badge variant="outline" className="text-xs">
                                  {item.metadata.model}
                                </Badge>
                              )}
                            </div>
                            <div className="bg-muted/30 rounded p-3 max-h-32 overflow-y-auto">
                              <pre className="whitespace-pre-wrap text-xs font-mono">
                                {item.content}
                              </pre>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleCopy(item.content, item.id)}
                                className="flex-1"
                              >
                                {copiedId === item.id ? (
                                  <>
                                    <Check className="w-3 h-3 mr-2" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 mr-2" />
                                    Copy
                                  </>
                                )}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDownload(item.content, platform.key)}
                                className="flex-1"
                              >
                                <Download className="w-3 h-3 mr-2" />
                                Download
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Globe, Eye, EyeOff, Tags } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Channel {
  id: string;
  name: string;
  description: string | null;
  subscriber_count: number;
  video_count: number;
}

interface VideoPublishingControlsProps {
  videoId: string;
  isPublic: boolean;
  contentType: string;
  description: string | null;
  channelId: string | null;
  onUpdate: () => void;
}

export const VideoPublishingControls: React.FC<VideoPublishingControlsProps> = ({
  videoId,
  isPublic,
  contentType,
  description,
  channelId,
  onUpdate
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    isPublic,
    contentType,
    description: description || '',
    channelId: channelId || 'none',
    keywords: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchChannels();
    }
  }, [open]);

  const fetchChannels = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData: any = {
        is_public: formData.isPublic,
        content_type: formData.contentType,
        description: formData.description.trim() || null,
        channel_id: (formData.channelId && formData.channelId !== 'none') ? formData.channelId : null
      };

      // If publishing, set published_at
      if (formData.isPublic && !isPublic) {
        updateData.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('videos')
        .update(updateData)
        .eq('id', videoId);

      if (error) throw error;

      toast({
        title: formData.isPublic ? "Video Published" : "Video Updated",
        description: formData.isPublic 
          ? "Your video is now visible in the Explore section"
          : "Video settings have been updated",
      });

      onUpdate();
      setOpen(false);
    } catch (error) {
      console.error('Error updating video:', error);
      toast({
        title: "Error",
        description: "Failed to update video settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const contentTypes = [
    { value: 'education', label: 'Educational' },
    { value: 'recipe', label: 'Recipe/Cooking' },
    { value: 'tutorial', label: 'Tutorial' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'news', label: 'News' },
    { value: 'documentary', label: 'Documentary' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          {isPublic ? (
            <>
              <Globe className="w-4 h-4" />
              Published
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              Publish to Explore
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Publish Video Settings
          </DialogTitle>
          <DialogDescription>
            Configure your video settings and make it discoverable in the Explore section
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Public Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="public">Make Public</Label>
              <p className="text-sm text-muted-foreground">
                Allow anyone to discover and watch this video
              </p>
            </div>
            <Switch
              id="public"
              checked={formData.isPublic}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, isPublic: checked }))
              }
            />
          </div>

          {formData.isPublic && (
            <>
              {/* Content Type */}
              <div className="space-y-2">
                <Label htmlFor="contentType">Content Category</Label>
                <Select
                  value={formData.contentType}
                  onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, contentType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your video to help people discover it..."
                  value={formData.description}
                  onChange={(e) => 
                    setFormData(prev => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                />
              </div>

              {/* Keywords */}
              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords</Label>
                <Input
                  id="keywords"
                  placeholder="accessibility, education, tutorial (comma separated)"
                  value={formData.keywords}
                  onChange={(e) => 
                    setFormData(prev => ({ ...prev, keywords: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Add relevant keywords to help people find your content
                </p>
              </div>

              {/* Channel Selection */}
              <div className="space-y-2">
                <Label htmlFor="channel">Channel (Optional)</Label>
                <Select
                  value={formData.channelId}
                  onValueChange={(value) => 
                    setFormData(prev => ({ 
                      ...prev, 
                      channelId: value === "none" ? "" : value 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No channel</SelectItem>
                    {channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{channel.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {channel.video_count} videos
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {channels.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Create a channel to organize your videos
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : formData.isPublic ? "Publish" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
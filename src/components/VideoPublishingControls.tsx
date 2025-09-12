import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Globe, Eye, EyeOff, Tags, AlertCircle } from 'lucide-react';
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
  videoStatus: string;
  onUpdate: () => void;
}

export const VideoPublishingControls: React.FC<VideoPublishingControlsProps> = ({
  videoId,
  isPublic,
  contentType,
  description,
  channelId,
  videoStatus,
  onUpdate
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showChannelCreation, setShowChannelCreation] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    contentType,
    description: description || '',
    channelId: channelId || '',
    keywords: ''
  });

  // Channel creation form
  const [newChannel, setNewChannel] = useState({
    name: '',
    description: ''
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

  const createChannel = async () => {
    if (!newChannel.name.trim()) {
      toast({
        title: "Error",
        description: "Channel name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('channels')
        .insert([{
          name: newChannel.name.trim(),
          description: newChannel.description.trim() || null,
          is_public: true,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Channel Created",
        description: "Your new channel has been created successfully",
      });

      // Reset form and refresh channels
      setNewChannel({ name: '', description: '' });
      setShowChannelCreation(false);
      await fetchChannels();
      
      // Auto-select the new channel
      setFormData(prev => ({ ...prev, channelId: data.id }));
    } catch (error) {
      console.error('Error creating channel:', error);
      toast({
        title: "Error",
        description: "Failed to create channel",
        variant: "destructive"
      });
    }
  };

  const handlePublish = async () => {
    if (!formData.channelId) {
      toast({
        title: "Channel Required",
        description: "Please select or create a channel to publish your video",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        is_public: true,
        content_type: formData.contentType,
        description: formData.description.trim() || null,
        channel_id: formData.channelId,
        published_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('videos')
        .update(updateData)
        .eq('id', videoId);

      if (error) throw error;

      toast({
        title: "Video Published",
        description: "Your video is now live on your channel and discoverable in Explore",
      });

      onUpdate();
      setOpen(false);
    } catch (error) {
      console.error('Error publishing video:', error);
      toast({
        title: "Error",
        description: "Failed to publish video",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnpublish = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('videos')
        .update({ 
          is_public: false,
          published_at: null 
        })
        .eq('id', videoId);

      if (error) throw error;

      toast({
        title: "Video Unpublished",
        description: "Your video is no longer public",
      });

      onUpdate();
      setOpen(false);
    } catch (error) {
      console.error('Error unpublishing video:', error);
      toast({
        title: "Error",
        description: "Failed to unpublish video",
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

  // Check if video is ready for publishing
  const isVideoReady = videoStatus === 'ready';
  
  if (isPublic) {
    // If already published, show unpublish option
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Globe className="w-4 h-4" />
            Published
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Video Published</DialogTitle>
            <DialogDescription>
              This video is currently published and visible in the Explore section
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button variant="destructive" onClick={handleUnpublish} disabled={loading}>
              {loading ? "Unpublishing..." : "Unpublish Video"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={isVideoReady ? "default" : "outline"} 
          className="gap-2"
          disabled={!isVideoReady}
        >
          <Globe className="w-4 h-4" />
          {isVideoReady ? "Publish to My Channel" : "Processing..."}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Publish to Channel
          </DialogTitle>
          <DialogDescription>
            Publish your processed video to your channel and make it discoverable
          </DialogDescription>
        </DialogHeader>

        {!isVideoReady && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="font-medium">Video Still Processing</p>
                  <p className="text-sm text-muted-foreground">
                    Your video is being processed for accessibility features. Please wait before publishing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isVideoReady && (
          <div className="space-y-6">
            {/* Channel Selection */}
            <div className="space-y-3">
              <Label>Select Channel</Label>
              {channels.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="font-medium mb-2">No Channels Yet</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create your first channel to organize and publish your videos
                      </p>
                      <Button onClick={() => setShowChannelCreation(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Channel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  <Select
                    value={formData.channelId}
                    onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, channelId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a channel" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowChannelCreation(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Channel
                  </Button>
                </div>
              )}
            </div>

            {/* Channel Creation Form */}
            {showChannelCreation && (
              <Card>
                <CardHeader>
                  <CardTitle>Create New Channel</CardTitle>
                  <CardDescription>
                    Channels help organize your videos and build your audience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="channelName">Channel Name</Label>
                    <Input
                      id="channelName"
                      placeholder="Enter channel name"
                      value={newChannel.name}
                      onChange={(e) => 
                        setNewChannel(prev => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="channelDescription">Description</Label>
                    <Textarea
                      id="channelDescription"
                      placeholder="Describe what this channel is about..."
                      value={newChannel.description}
                      onChange={(e) => 
                        setNewChannel(prev => ({ ...prev, description: e.target.value }))
                      }
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createChannel}>
                      Create Channel
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowChannelCreation(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Content Details */}
            <div className="space-y-4">
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
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          {isVideoReady && (
            <Button 
              onClick={handlePublish} 
              disabled={loading || !formData.channelId}
            >
              {loading ? "Publishing..." : "Publish to Channel"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
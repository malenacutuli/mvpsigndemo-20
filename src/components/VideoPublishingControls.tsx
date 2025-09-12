import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Globe, Eye, EyeOff, AlertCircle, Trash2, Replace } from 'lucide-react';
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
  const [editingComplete, setEditingComplete] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    contentType,
    description: description || '',
    channelId: channelId || 'none',
    keywords: ''
  });
  
  // New channel form
  const [newChannel, setNewChannel] = useState({
    name: '',
    description: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching channels:', error);
        return;
      }

      setChannels(data || []);
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  };

  const createChannel = async () => {
    if (!newChannel.name.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('channels')
        .insert({
          name: newChannel.name,
          description: newChannel.description,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setChannels(prev => [data, ...prev]);
      setFormData(prev => ({ ...prev, channelId: data.id }));
      setNewChannel({ name: '', description: '' });
      setShowChannelCreation(false);
      
      toast({
        title: "Channel created",
        description: `${data.name} has been created successfully.`
      });
    } catch (error: any) {
      toast({
        title: "Error creating channel",
        description: error.message,
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handlePublish = async () => {
    if (!editingComplete) {
      toast({
        title: "Complete editing first",
        description: "Please finish editing your video before publishing to a channel.",
        variant: "destructive"
      });
      return;
    }

    if (formData.channelId === 'none') {
      toast({
        title: "Channel required",
        description: "Please select or create a channel to publish your video.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('videos')
        .update({
          is_public: true,
          published_at: new Date().toISOString(),
          channel_id: formData.channelId,
          content_type: formData.contentType,
          description: formData.description
        })
        .eq('id', videoId);

      if (error) throw error;

      onUpdate();
      setOpen(false);
      
      toast({
        title: "Video published",
        description: "Your video has been published to your channel."
      });
    } catch (error: any) {
      toast({
        title: "Error publishing video",
        description: error.message,
        variant: "destructive"
      });
    }
    setLoading(false);
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

      onUpdate();
      toast({
        title: "Video unpublished",
        description: "Your video has been removed from public view."
      });
    } catch (error: any) {
      toast({
        title: "Error unpublishing video",
        description: error.message,
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleReplace = async () => {
    // TODO: Implement video replacement functionality
    toast({
      title: "Feature coming soon",
      description: "Video replacement functionality will be available soon."
    });
  };

  const handleSaveDetails = async () => {
    setLoading(true);
    try {
      const updatePayload: any = {
        channel_id: formData.channelId === 'none' ? null : formData.channelId,
        content_type: formData.contentType,
        description: formData.description
      };

      const { error } = await supabase
        .from('videos')
        .update(updatePayload)
        .eq('id', videoId);

      if (error) throw error;

      onUpdate();
      toast({
        title: "Details saved",
        description: "Channel and details saved. You can publish when ready."
      });
    } catch (error: any) {
      toast({
        title: "Error saving details",
        description: error.message,
        variant: "destructive"
      });
    }
    setLoading(false);
  };
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;

      toast({
        title: "Video deleted",
        description: "Your video has been permanently deleted."
      });
      
      // Redirect to videos page
      window.location.href = '/videos';
    } catch (error: any) {
      toast({
        title: "Error deleting video",
        description: error.message,
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  // Check if video is ready for publishing
  const isVideoReady = videoStatus === 'ready';
  const hasChannel = channels.length > 0 || formData.channelId !== 'none';

  if (isPublic) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              <Globe className="w-3 h-3 mr-1" />
              Published
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReplace}
              disabled={loading}
            >
              <Replace className="w-3 h-3 mr-1" />
              Replace
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnpublish}
              disabled={loading}
            >
              {loading ? "Unpublishing..." : "Unpublish"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={loading}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {!isVideoReady ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-md">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
          <span className="text-sm text-blue-700">Processing...</span>
          <Button variant="ghost" size="sm" onClick={onUpdate}>↻</Button>
        </div>
      ) : !editingComplete ? (
        <Button
          variant="outline"
          onClick={() => setEditingComplete(true)}
        >
          ✓ Done Editing
        </Button>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              Publish to Channel
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Publish to Channel</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Channel Selection */}
              {channels.length === 0 && !showChannelCreation ? (
                <div className="text-center p-4 border border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground mb-3">
                    Create a channel to publish your video.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowChannelCreation(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Channel
                  </Button>
                </div>
              ) : showChannelCreation ? (
                <div className="space-y-3">
                  <Label>Create New Channel</Label>
                  <Input
                    value={newChannel.name}
                    onChange={(e) => setNewChannel(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Channel name"
                  />
                  <Textarea
                    value={newChannel.description}
                    onChange={(e) => setNewChannel(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Channel description (optional)"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={createChannel}
                      disabled={!newChannel.name.trim() || loading}
                      size="sm"
                    >
                      {loading ? "Creating..." : "Create"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowChannelCreation(false)}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Label>Channel</Label>
                  <Select
                    value={formData.channelId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, channelId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {channels.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          {channel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChannelCreation(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    New Channel
                  </Button>
                </div>
              )}

              <div className="space-y-3">
                <Label>Description (optional)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your video..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handlePublish}
                disabled={loading || formData.channelId === 'none'}
              >
                {loading ? "Publishing..." : "Publish"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={loading}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
};
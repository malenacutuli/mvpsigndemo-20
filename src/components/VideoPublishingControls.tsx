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
    <Card className="p-4">
      <div className="space-y-4">
        {/* Editing Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Editing Status:</span>
            {editingComplete ? (
              <Badge variant="default">
                <Eye className="w-3 h-3 mr-1" />
                Ready to Publish
              </Badge>
            ) : (
              <Badge variant="secondary">
                <EyeOff className="w-3 h-3 mr-1" />
                Editing in Progress
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingComplete(!editingComplete)}
          >
            {editingComplete ? "Resume Editing" : "Mark as Complete"}
          </Button>
        </div>

        {/* Publishing Controls */}
        {!isVideoReady && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <AlertCircle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Video is still processing. Please wait before publishing.
            </span>
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button 
              className="w-full" 
              disabled={!isVideoReady || !editingComplete}
            >
              {!isVideoReady ? "Processing..." : !editingComplete ? "Complete Editing First" : "Publish to My Channel"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Publish Video to Channel</DialogTitle>
              <DialogDescription>
                Choose a channel and configure your video settings before publishing.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Channel Selection */}
              <div className="space-y-3">
                <Label htmlFor="channel">Select Channel</Label>
                {channels.length === 0 && !showChannelCreation ? (
                  <div className="text-center p-4 border border-dashed rounded-lg">
                    <p className="text-sm text-muted-foreground mb-3">
                      You need a channel to publish your video.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setShowChannelCreation(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Channel
                    </Button>
                  </div>
                ) : showChannelCreation ? (
                  <Card className="p-4">
                    <h3 className="font-medium mb-3">Create New Channel</h3>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="channelName">Channel Name *</Label>
                        <Input
                          id="channelName"
                          value={newChannel.name}
                          onChange={(e) => setNewChannel(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter channel name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="channelDescription">Channel Description</Label>
                        <Textarea
                          id="channelDescription"
                          value={newChannel.description}
                          onChange={(e) => setNewChannel(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe your channel"
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={createChannel}
                          disabled={!newChannel.name.trim() || loading}
                          size="sm"
                        >
                          {loading ? "Creating..." : "Create Channel"}
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
                  </Card>
                ) : (
                  <div className="space-y-3">
                    <Select
                      value={formData.channelId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, channelId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a channel" />
                      </SelectTrigger>
                      <SelectContent>
                        {channels.map((channel) => (
                          <SelectItem key={channel.id} value={channel.id}>
                            {channel.name} ({channel.video_count} videos)
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

              {/* Video Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contentType">Content Type</Label>
                  <Select
                    value={formData.contentType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, contentType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recipe">Recipe</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="keywords">Keywords (optional)</Label>
                  <Input
                    id="keywords"
                    value={formData.keywords}
                    onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
                    placeholder="cooking, tutorial, etc."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your video..."
                  rows={3}
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
                {loading ? "Publishing..." : "Publish Video"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete Video
          </Button>
        </div>
      </div>
    </Card>
  );
};
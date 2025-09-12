import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Users, Video, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Channel {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  subscriber_count: number;
  video_count: number;
  is_public: boolean;
  created_at: string;
}

export const ChannelManager: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: true
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

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Error fetching channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (channel?: Channel) => {
    if (channel) {
      setEditingChannel(channel);
      setFormData({
        name: channel.name,
        description: channel.description || '',
        isPublic: channel.is_public
      });
    } else {
      setEditingChannel(null);
      setFormData({
        name: '',
        description: '',
        isPublic: true
      });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
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

      const channelData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        is_public: formData.isPublic,
        user_id: user.id
      };

      if (editingChannel) {
        // Update existing channel
        const { error } = await supabase
          .from('channels')
          .update(channelData)
          .eq('id', editingChannel.id);

        if (error) throw error;

        toast({
          title: "Channel Updated",
          description: "Your channel has been updated successfully",
        });
      } else {
        // Create new channel
        const { error } = await supabase
          .from('channels')
          .insert([channelData]);

        if (error) throw error;

        toast({
          title: "Channel Created",
          description: "Your new channel has been created successfully",
        });
      }

      fetchChannels();
      setOpen(false);
    } catch (error) {
      console.error('Error saving channel:', error);
      toast({
        title: "Error",
        description: "Failed to save channel",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (channel: Channel) => {
    if (!confirm(`Are you sure you want to delete the channel "${channel.name}"? This will remove the channel assignment from all videos but won't delete the videos themselves.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channel.id);

      if (error) throw error;

      toast({
        title: "Channel Deleted",
        description: "The channel has been deleted successfully",
      });

      fetchChannels();
    } catch (error) {
      console.error('Error deleting channel:', error);
      toast({
        title: "Error",
        description: "Failed to delete channel",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Channels</h2>
          <p className="text-muted-foreground">
            Create and manage channels to organize your videos
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Channel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingChannel ? 'Edit Channel' : 'Create New Channel'}
              </DialogTitle>
              <DialogDescription>
                Channels help organize your videos and make them easier for viewers to discover
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Channel Name</Label>
                <Input
                  id="name"
                  placeholder="Enter channel name"
                  value={formData.name}
                  onChange={(e) => 
                    setFormData(prev => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this channel is about..."
                  value={formData.description}
                  onChange={(e) => 
                    setFormData(prev => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingChannel ? 'Update' : 'Create'} Channel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {channels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Channels Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first channel to start organizing your videos and building an audience
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Channel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {channels.map((channel) => (
            <Card key={channel.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={channel.avatar_url || undefined} />
                      <AvatarFallback>
                        {channel.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {channel.name}
                        {channel.is_public && (
                          <Badge variant="outline">Public</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {channel.description || 'No description'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(channel)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(channel)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Video className="w-4 h-4" />
                    {channel.video_count} videos
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {channel.subscriber_count} subscribers
                  </div>
                  <div>
                    Created {new Date(channel.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
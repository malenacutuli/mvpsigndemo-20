import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Globe, Eye, EyeOff, AlertCircle, Trash2, Replace, Upload } from 'lucide-react';
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
  onDelete: () => void;
  isDeleting: boolean;
}

export const VideoPublishingControls: React.FC<VideoPublishingControlsProps> = ({
  videoId,
  isPublic,
  contentType,
  description,
  channelId,
  videoStatus,
  onUpdate,
  onDelete,
  isDeleting
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showChannelCreation, setShowChannelCreation] = useState(false);
  const [editingComplete, setEditingComplete] = useState(false);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [replacing, setReplacing] = useState(false);
  
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
    if (!replacementFile) {
      toast({
        title: "No file selected",
        description: "Please select a video file to upload.",
        variant: "destructive"
      });
      return;
    }

    setReplacing(true);
    try {
      // Generate new storage path
      const fileExt = replacementFile.name.split('.').pop();
      const fileName = `${videoId}-replacement-${Date.now()}.${fileExt}`;
      
      // Upload new video file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, replacementFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Update video record with new storage path and reset status
      const { error: updateError } = await supabase
        .from('videos')
        .update({
          storage_path: uploadData.path,
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId);

      if (updateError) throw updateError;

      // Close dialog and refresh
      setShowReplaceDialog(false);
      setReplacementFile(null);
      onUpdate();
      
      toast({
        title: "Video replacement started",
        description: "Your new video is being processed. This may take a few minutes."
      });
    } catch (error: any) {
      toast({
        title: "Error replacing video",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setReplacing(false);
    }
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
    onDelete();
  };

  // Check if video is ready for publishing - video is ready when uploaded successfully
  const isVideoReady = videoStatus === 'uploaded';
  const hasChannel = channels.length > 0 || formData.channelId !== 'none';

  if (isPublic) {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-2 w-full">
          <Button asChild size="sm" variant="outline" className="flex-1">
            <span className="flex items-center justify-center gap-1">
              <Globe className="w-3 h-3" />
              Published
            </span>
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReplaceDialog(true)}
                disabled={loading}
                className="px-3"
              >
                <Replace className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Replace video</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnpublish}
                disabled={loading}
                className="px-3"
              >
                <EyeOff className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Unpublish</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete video</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <>
      <TooltipProvider>
        <div className="flex items-center gap-2 w-full">
          {!isVideoReady ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-md flex-1">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-700">Processing...</span>
              <Button variant="ghost" size="sm" onClick={onUpdate}>↻</Button>
            </div>
          ) : !editingComplete ? (
            <>
              <Button
                variant="outline"
                onClick={() => setEditingComplete(true)}
                className="flex-1"
              >
                ✓ Done Editing
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-3"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete video</p>
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="flex-1">
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
                          <SelectContent className="bg-background border border-border shadow-lg z-50">
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-3"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete video</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </TooltipProvider>

      {/* Video Replacement Dialog */}
      <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Replace Video</DialogTitle>
            <DialogDescription>
              Upload a new video file to replace the current one. The same video ID and metadata will be kept.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Select New Video File</Label>
              <Input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setReplacementFile(file);
                  }
                }}
                className="cursor-pointer"
              />
              {replacementFile && (
                <div className="text-sm text-muted-foreground">
                  Selected: {replacementFile.name} ({(replacementFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">What happens when you replace:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• The video file will be updated</li>
                <li>• Same URL and embed links will continue to work</li>
                <li>• Video will be reprocessed (may take a few minutes)</li>
                <li>• Title, description, and settings are preserved</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowReplaceDialog(false);
                setReplacementFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReplace}
              disabled={!replacementFile || replacing}
            >
              {replacing ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Replace className="w-4 h-4 mr-2" />
                  Replace Video
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
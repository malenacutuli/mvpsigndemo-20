import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Users, Video, Edit, Trash2, Upload, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
      setAvatarPreview(channel.avatar_url);
    } else {
      setEditingChannel(null);
      setFormData({
        name: '',
        description: '',
        isPublic: true
      });
      setAvatarPreview(null);
    }
    setAvatarFile(null);
    setOpen(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('common.error'),
        description: t('channels.errors.selectImage'),
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('common.error'), 
        description: t('channels.errors.fileTooLarge'),
        variant: "destructive"
      });
      return;
    }

    setAvatarFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('thumbnails')
        .upload(fileName, avatarFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: t('common.error'),
        description: t('channels.errors.nameRequired'),
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let avatarUrl = editingChannel?.avatar_url || null;
      
      // Upload new avatar if selected
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }

      const channelData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        is_public: formData.isPublic,
        avatar_url: avatarUrl,
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
          title: t('channels.updated'),
          description: t('channels.updatedSuccess'),
        });
      } else {
        // Create new channel
        const { error } = await supabase
          .from('channels')
          .insert([channelData]);

        if (error) throw error;

        toast({
          title: t('channels.created'), 
          description: t('channels.createdSuccess'),
        });
      }

      fetchChannels();
      setOpen(false);
    } catch (error) {
      console.error('Error saving channel:', error);
      toast({
        title: t('common.error'),
        description: t('channels.errors.saveFailed'),
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (channel: Channel) => {
    if (!confirm(t('channels.deleteConfirm', { name: channel.name }))) {
      return;
    }

    try {
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channel.id);

      if (error) throw error;

      toast({
        title: t('channels.deleted'),
        description: t('channels.deletedSuccess'),
      });

      fetchChannels();
    } catch (error) {
      console.error('Error deleting channel:', error);
      toast({
        title: t('common.error'),
        description: t('channels.errors.deleteFailed'),
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
          <h2 className="text-2xl font-light">{t('channels.title')}</h2>
          <p className="text-muted-foreground font-light">
            {t('channels.subtitle')}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="font-light">
              <Plus className="w-4 h-4 mr-2" />
              {t('channels.create')}
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-light">
                {editingChannel ? t('channels.edit') : t('channels.createNew')}
              </DialogTitle>
              <DialogDescription className="font-light text-base leading-relaxed">
                {t('channels.description')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-light">{t('channels.avatar')}</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={avatarPreview || undefined} />
                    <AvatarFallback>
                      {formData.name ? formData.name.substring(0, 2).toUpperCase() : <Camera className="w-6 h-6" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="font-light"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {avatarPreview ? t('channels.changeAvatar') : t('channels.uploadAvatar')}
                    </Button>
                    <p className="text-xs text-muted-foreground font-light">
                      {t('channels.avatarHelp')}
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="font-light">{t('channels.name')}</Label>
                <Input
                  id="name"
                  placeholder={t('channels.namePlaceholder')}
                  value={formData.name}
                  onChange={(e) => 
                    setFormData(prev => ({ ...prev, name: e.target.value }))
                  }
                  className="font-light"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="font-light">{t('channels.descriptionLabel')}</Label>
                <Textarea
                  id="description"
                  placeholder={t('channels.descriptionPlaceholder')}
                  value={formData.description}
                  onChange={(e) => 
                    setFormData(prev => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                  className="font-light"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} className="font-light">
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={uploading} className="font-light">
                {uploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                ) : null}
                {editingChannel ? t('common.update') : t('common.create')} {t('channels.channel')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {channels.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-light mb-2">{t('channels.noChannels')}</h3>
            <p className="text-muted-foreground text-center mb-4 font-light">
              {t('channels.noChannelsText')}
            </p>
            <Button onClick={() => handleOpenDialog()} className="font-light">
              <Plus className="w-4 h-4 mr-2" />
              {t('channels.createFirst')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {channels.map((channel) => (
            <Card key={channel.id} className="rounded-xl">
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
                      <CardTitle className="flex items-center gap-2 font-light">
                        {channel.name}
                        {channel.is_public && (
                          <Badge variant="outline" className="font-light">{t('channels.public')}</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1 font-light">
                        {channel.description || t('channels.noDescription')}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(channel)}
                      className="font-light"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(channel)}
                      className="font-light"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-muted-foreground font-light">
                  <div className="flex items-center gap-1">
                    <Video className="w-4 h-4" />
                    {channel.video_count} {t('channels.videos')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {channel.subscriber_count} {t('channels.subscribers')}
                  </div>
                  <div>
                    {t('channels.created')} {new Date(channel.created_at).toLocaleDateString()}
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
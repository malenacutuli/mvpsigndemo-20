import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Navigation } from '@/components/Navigation';
import { useToast } from '@/hooks/use-toast';
import { 
  Eye, 
  Languages, 
  User, 
  Bell, 
  BellRing, 
  Video,
  Play
} from 'lucide-react';

interface PublicVideo {
  id: string;
  title: string;
  description: string | null;
  language: string;
  content_type: string;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  view_count: number;
  published_at: string;
}

interface Channel {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  subscriber_count: number;
  video_count: number;
}

const Channel = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<PublicVideo[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchChannelData();
      checkSubscription();
    }
  }, [id]);

  const fetchChannelData = async () => {
    try {
      // Fetch channel info
      const { data: channelData, error: channelError } = await supabase
        .from('channels')
        .select('*')
        .eq('id', id)
        .eq('is_public', true)
        .single();

      if (channelError) throw channelError;
      setChannel(channelData);

      // Fetch channel videos
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .eq('channel_id', id)
        .eq('is_public', true)
        .in('status', ['ready', 'uploaded'])
        .order('published_at', { ascending: false });

      if (videosError) throw videosError;
      setVideos(videosData || []);

    } catch (error) {
      console.error('Error fetching channel data:', error);
      toast({
        title: "Error",
        description: "Failed to load channel data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('channel_subscriptions')
        .select('id')
        .eq('channel_id', id)
        .eq('subscriber_user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setIsSubscribed(!!data);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleSubscribe = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Login Required",
          description: "Please log in to subscribe to channels",
        });
        return;
      }

      if (isSubscribed) {
        const { error } = await supabase
          .from('channel_subscriptions')
          .delete()
          .eq('channel_id', id)
          .eq('subscriber_user_id', user.id);

        if (error) throw error;
        setIsSubscribed(false);
        
        toast({
          title: "Unsubscribed",
          description: "Successfully unsubscribed from channel",
        });
      } else {
        const { error } = await supabase
          .from('channel_subscriptions')
          .insert({
            channel_id: id,
            subscriber_user_id: user.id,
          });

        if (error) throw error;
        setIsSubscribed(true);
        
        toast({
          title: "Subscribed",
          description: "Successfully subscribed to channel",
        });
      }
    } catch (error) {
      console.error('Error managing subscription:', error);
      toast({
        title: "Error",
        description: "Failed to update subscription",
        variant: "destructive",
      });
    }
  };

  const formatViewCount = (count: number) => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getLanguageDisplay = (lang: string) => {
    const languages: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French', 
      'de': 'German'
    };
    return languages[lang] || lang;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto p-6">
          <div className="flex items-center gap-6 mb-8">
            <Skeleton className="w-32 h-32 rounded-full" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Channel Not Found</h1>
            <p className="text-muted-foreground mb-6">The channel you're looking for doesn't exist or is not public.</p>
            <Link to="/explore">
              <Button>Back to Explore</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto p-6">
        {/* Channel Header */}
        <div className="flex flex-col md:flex-row items-start gap-6 mb-8 p-6 bg-card rounded-lg border">
          <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
            {channel.avatar_url ? (
              <img src={channel.avatar_url} alt={channel.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-16 h-16 text-muted-foreground" />
            )}
          </div>
          
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl font-bold">{channel.name}</h1>
              {channel.description && (
                <p className="text-muted-foreground mt-2">{channel.description}</p>
              )}
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground">{formatViewCount(channel.subscriber_count)}</span> subscribers
              </div>
              <div>
                <span className="font-semibold text-foreground">{channel.video_count}</span> videos
              </div>
            </div>
            
            <Button
              onClick={handleSubscribe}
              variant={isSubscribed ? "outline" : "default"}
              className="w-full md:w-auto"
            >
              {isSubscribed ? (
                <>
                  <BellRing className="w-4 h-4 mr-2" />
                  Subscribed
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Subscribe
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Videos Grid */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Videos</h2>
          
          {videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => (
                <Link key={video.id} to={`/watch/${video.id}`}>
                  <Card className="group cursor-pointer hover:shadow-lg transition-all duration-300">
                    <div className="relative aspect-video overflow-hidden rounded-t-lg">
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                          <Video className="w-12 h-12 text-primary/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-primary text-primary-foreground rounded-full p-2">
                          <Play className="w-4 h-4 fill-current" />
                        </div>
                      </div>
                      {video.duration_seconds && (
                        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                          {formatDuration(video.duration_seconds)}
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                        {video.title}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>{formatViewCount(video.view_count)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Languages className="w-3 h-3" />
                          <span>{getLanguageDisplay(video.language)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">{video.content_type}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Videos Yet</h3>
              <p className="text-muted-foreground">This channel hasn't published any videos yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Channel;
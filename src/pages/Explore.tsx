import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Navigation } from '@/components/Navigation';
import { 
  Search, 
  Play, 
  Eye, 
  Languages, 
  Users, 
  Bell, 
  BellRing,
  Globe,
  Video,
  TrendingUp,
  Bookmark,
  User,
  ChevronRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

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
  created_at: string;
  channel_id: string | null;
  storage_path: string | null;
  channel?: {
    id: string;
    name: string;
    avatar_url: string | null;
    subscriber_count: number;
  };
}

interface Channel {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  subscriber_count: number;
  video_count: number;
}

interface ChannelWithVideos extends Channel {
  videos: PublicVideo[];
}

const Explore = () => {
  const { t } = useTranslation();
  const [videos, setVideos] = useState<PublicVideo[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelsWithVideos, setChannelsWithVideos] = useState<ChannelWithVideos[]>([]);
  const [featuredVideo, setFeaturedVideo] = useState<PublicVideo | null>(null);
  const [subscriptions, setSubscriptions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('videos');
  const { toast } = useToast();
  const navigate = useNavigate();

  const categories = [
    { id: 'all', label: 'All', icon: Globe },
  ];

  const sidebarItems = [
    { id: 'videos', label: t('explore.exploreVideos'), icon: Play },
    { id: 'channels', label: t('explore.channels'), icon: Users },
    { id: 'subscribed', label: t('explore.subscribed'), icon: Bell },
    { id: 'trending', label: t('explore.trending'), icon: TrendingUp },
    { id: 'saved', label: t('explore.saved'), icon: Bookmark },
  ];

  useEffect(() => {
    fetchData();
    fetchUserSubscriptions();
  }, []);

  const fetchData = async () => {
    try {
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .eq('is_public', true)
        .in('status', ['ready', 'uploaded'])
        .order('published_at', { ascending: false })
        .limit(50);

      if (videosError) throw videosError;

      const { data: channelsData, error: channelsError } = await supabase
        .from('channels')
        .select('*')
        .eq('is_public', true)
        .order('subscriber_count', { ascending: false })
        .limit(20);

      if (channelsError) throw channelsError;

      const videosWithChannels = (videosData || []).map(video => ({
        ...video,
        channel: video.channel_id 
          ? (channelsData || []).find(channel => channel.id === video.channel_id)
          : null
      }));

      const featured = videosWithChannels.find(v => v.view_count > 10) || videosWithChannels[0];
      setFeaturedVideo(featured || null);

      const channelMap = new Map<string, ChannelWithVideos>();
      
      (channelsData || []).forEach(channel => {
        channelMap.set(channel.id, { ...channel, videos: [] });
      });

      videosWithChannels.forEach(video => {
        if (video.channel_id && channelMap.has(video.channel_id)) {
          channelMap.get(video.channel_id)!.videos.push(video);
        }
      });

      const channelsWithVideosArray = Array.from(channelMap.values())
        .filter(channel => channel.videos.length > 0)
        .sort((a, b) => b.subscriber_count - a.subscriber_count);

      setVideos(videosWithChannels);
      setChannels(channelsData || []);
      setChannelsWithVideos(channelsWithVideosArray);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: t('explore.error'),
        description: "Failed to load videos and channels",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSubscriptions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('channel_subscriptions')
        .select('channel_id')
        .eq('subscriber_user_id', user.id);

      if (error) throw error;
      
      const subscribedChannels = new Set(data?.map(sub => sub.channel_id) || []);
      setSubscriptions(subscribedChannels);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  };

  const handleSubscribe = async (channelId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: t('explore.loginRequired'),
          description: t('explore.loginToSubscribe'),
        });
        navigate('/auth');
        return;
      }

      const isSubscribed = subscriptions.has(channelId);
      
      if (isSubscribed) {
        const { error } = await supabase
          .from('channel_subscriptions')
          .delete()
          .eq('channel_id', channelId)
          .eq('subscriber_user_id', user.id);

        if (error) throw error;
        
        setSubscriptions(prev => {
          const newSet = new Set(prev);
          newSet.delete(channelId);
          return newSet;
        });
        
        toast({
          title: t('explore.unsubscribed'),
          description: t('explore.unsubscribedMessage'),
        });
      } else {
        const { error } = await supabase
          .from('channel_subscriptions')
          .insert({
            channel_id: channelId,
            subscriber_user_id: user.id,
          });

        if (error) throw error;
        
        setSubscriptions(prev => new Set([...prev, channelId]));
        
        toast({
          title: t('explore.subscribed'),
          description: t('explore.subscribedMessage'),
        });
      }
    } catch (error) {
      console.error('Error managing subscription:', error);
      toast({
        title: t('explore.error'),
        description: t('explore.subscriptionError'),
        variant: "destructive",
      });
    }
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (video.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (channel.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
        <div className="flex">
          <div className="w-64 border-r bg-card p-4">
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
          <div className="flex-1 p-6">
            <Skeleton className="h-10 w-96 mb-6" />
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(12)].map((_, i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="flex">
        <div className="w-64 border-r bg-card min-h-screen">
          <div className="p-4">
            <div className="space-y-1">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === item.id 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="border-b bg-card">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">
                  {activeTab === 'videos' && t('explore.title')}
                  {activeTab === 'channels' && t('explore.channels')}
                  {activeTab === 'subscribed' && t('explore.subscribed')}
                  {activeTab === 'trending' && t('explore.trending')}
                  {activeTab === 'saved' && t('explore.saved')}
                </h1>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder={t('explore.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {activeTab === 'videos' && (
              <>
                {featuredVideo && (
                  <div className="relative">
                    <h2 className="text-xl font-semibold mb-4">{t('explore.featured')}</h2>
                    <Link to={`/watch/${featuredVideo.id}`}>
                      <Card className="group cursor-pointer overflow-hidden hover:shadow-xl transition-all duration-300">
                        <div className="relative aspect-video md:aspect-[21/9] overflow-hidden">
                          {featuredVideo.thumbnail_url ? (
                            <img
                              src={featuredVideo.thumbnail_url}
                              alt={featuredVideo.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                              <Video className="w-24 h-24 text-primary/20" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-300" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-primary text-primary-foreground rounded-full p-6 group-hover:scale-110 transition-transform duration-300">
                              <Play className="w-12 h-12 fill-current" />
                            </div>
                          </div>
                          {featuredVideo.duration_seconds && (
                            <div className="absolute bottom-4 right-4 bg-black/80 text-white text-sm px-2 py-1 rounded">
                              {formatDuration(featuredVideo.duration_seconds)}
                            </div>
                          )}
                        </div>
                        <CardContent className="p-6">
                          <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                            {featuredVideo.title}
                          </h3>
                            <div className="flex items-center gap-4 text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                <span>{formatViewCount(featuredVideo.view_count)} {t('explore.views')}</span>
                              </div>
                            <div className="flex items-center gap-2">
                              <Languages className="w-4 h-4" />
                              <span>{getLanguageDisplay(featuredVideo.language)}</span>
                            </div>
                            <Badge variant="secondary">{featuredVideo.content_type}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                )}

                {channelsWithVideos.map((channel) => (
                  <div key={channel.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          {channel.avatar_url ? (
                            <img src={channel.avatar_url} alt={channel.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold">{channel.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatViewCount(channel.subscriber_count)} {t('explore.subscribers')} • {channel.video_count} {t('explore.videos')}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleSubscribe(channel.id)}
                        variant={subscriptions.has(channel.id) ? "outline" : "default"}
                        size="sm"
                      >
                        {subscriptions.has(channel.id) ? (
                          <>
                            <BellRing className="w-4 h-4 mr-2" />
                            {t('explore.subscribed')}
                          </>
                        ) : (
                          <>
                            <Bell className="w-4 h-4 mr-2" />
                            {t('explore.subscribe')}
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {channel.videos.slice(0, 4).map((video) => (
                        <Link key={video.id} to={`/watch/${video.id}`}>
                          <Card className="group cursor-pointer hover:shadow-lg transition-all duration-300">
                            <div className="relative aspect-video overflow-hidden rounded-t-lg">
                              {video.thumbnail_url ? (
                                <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                  <Video className="w-8 h-8 text-muted-foreground" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="bg-primary text-primary-foreground rounded-full p-2">
                                  <Play className="w-6 h-6 fill-current" />
                                </div>
                              </div>
                              {video.duration_seconds && (
                                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                                  {formatDuration(video.duration_seconds)}
                                </div>
                              )}
                            </div>
                            <CardContent className="p-4">
                              <h4 className="font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors text-sm">
                                {video.title}
                              </h4>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Eye className="w-3 h-3" />
                                  <span>{formatViewCount(video.view_count)}</span>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {video.content_type}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'channels' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredChannels.map((channel) => (
                  <Card key={channel.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="text-center">
                      {channel.avatar_url ? (
                        <img src={channel.avatar_url} alt={channel.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-4" />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                          <User className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <h3 className="text-xl font-semibold">{channel.name}</h3>
                      {channel.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {channel.description}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="flex justify-center space-x-6 mb-4 text-sm text-muted-foreground">
                        <div>
                          <div className="font-semibold text-foreground">{formatViewCount(channel.subscriber_count)}</div>
                          <div>{t('explore.subscribers')}</div>
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{channel.video_count}</div>
                          <div>{t('explore.videos')}</div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleSubscribe(channel.id)}
                        variant={subscriptions.has(channel.id) ? "outline" : "default"}
                        size="sm"
                        className="w-full"
                      >
                        {subscriptions.has(channel.id) ? (
                          <>
                            <BellRing className="w-4 h-4 mr-2" />
                            {t('explore.subscribed')}
                          </>
                        ) : (
                          <>
                            <Bell className="w-4 h-4 mr-2" />
                            {t('explore.subscribe')}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {(activeTab === 'subscribed' || activeTab === 'trending' || activeTab === 'saved') && (
              <div className="text-center py-12">
                <h3 className="text-xl font-semibold mb-2">{t('explore.comingSoon')}</h3>
                <p className="text-muted-foreground">
                  {t('explore.comingSoonDesc')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Explore;
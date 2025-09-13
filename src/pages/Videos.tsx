import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Calendar, Clock, Languages, Eye, Trash2, Settings, Users } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ThumbnailGenerator } from '@/components/ThumbnailGenerator';
import { Navigation } from '@/components/Navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { VideoPublishingControls } from '@/components/VideoPublishingControls';
import { ChannelManager } from '@/components/ChannelManager';

interface Video {
  id: string;
  title: string;
  description: string | null;
  language: string;
  content_type: string;
  status: string;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  channel_id: string | null;
}

export default function Videos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deletingVideo, setDeletingVideo] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      // Check authentication state first
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.log('No authenticated user found');
        setVideos([]);
        setLoading(false);
        return;
      }

      // Fetch only the authenticated user's videos
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
      
    } catch (error) {
      console.error('Error fetching videos:', error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (video.description && video.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLanguage = languageFilter === 'all' || video.language === languageFilter;
    const matchesStatus = statusFilter === 'all' || video.status === statusFilter;
    
    return matchesSearch && matchesLanguage && matchesStatus;
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'uploading': return 'bg-blue-100 text-blue-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  const deleteVideo = async (videoId: string) => {
    setDeletingVideo(videoId);
    try {
      // First, delete associated storage files
      const video = videos.find(v => v.id === videoId);
      if (video) {
        // Delete video file from storage
        if (video.storage_path) {
          try {
            await supabase.storage
              .from('videos')
              .remove([video.storage_path]);
          } catch (storageError) {
            console.warn('Error deleting video file from storage:', storageError);
          }
        }

        // Delete thumbnail from storage
        if (video.thumbnail_url) {
          try {
            // Extract the path from the thumbnail URL
            const thumbnailPath = video.thumbnail_url.split('/').pop();
            if (thumbnailPath) {
              await supabase.storage
                .from('thumbnails')
                .remove([thumbnailPath]);
            }
          } catch (storageError) {
            console.warn('Error deleting thumbnail from storage:', storageError);
          }
        }
      }

      // Delete the video record from database
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;

      // Update local state
      setVideos(videos.filter(v => v.id !== videoId));
      
      toast({
        title: "Video deleted",
        description: "The video has been successfully deleted.",
      });
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: "Error deleting video",
        description: "There was an error deleting the video. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeletingVideo(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your videos...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Tabs defaultValue="videos" className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Video Management</h1>
                <p className="text-muted-foreground">
                  Manage your videos, publish them to Explore, and organize with channels
                </p>
              </div>
              <div className="flex items-center gap-2 mt-4 md:mt-0">
                <TabsList>
                  <TabsTrigger value="videos">My Videos</TabsTrigger>
                  <TabsTrigger value="channels">Channels</TabsTrigger>
                </TabsList>
                <Button asChild>
                  <Link to="/upload">Upload New Video</Link>
                </Button>
              </div>
            </div>

            <TabsContent value="videos" className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search videos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <Select value={languageFilter} onValueChange={setLanguageFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All languages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All languages</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="uploading">Uploading</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Thumbnail Generator */}
              <div>
                <ThumbnailGenerator 
                  videos={videos}
                  onThumbnailsGenerated={fetchVideos}
                />
              </div>

              {/* Videos Grid */}
              {filteredVideos.length === 0 ? (
                <div className="text-center py-12">
                  <Play className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No videos found</h3>
                  <p className="text-muted-foreground mb-4">
                    {videos.length === 0 
                      ? "You haven't uploaded any videos yet." 
                      : "No videos match your current filters."}
                  </p>
                  {videos.length === 0 && (
                    <Button asChild>
                      <Link to="/upload">Upload Your First Video</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredVideos.map((video) => (
                    <Card key={video.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="p-0">
                        <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center relative overflow-hidden">
                          {video.thumbnail_url ? (
                            <img 
                              src={video.thumbnail_url} 
                              alt={video.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error('❌ Thumbnail failed to load:', video.thumbnail_url);
                                console.error('Error details:', e);
                                // Hide the broken image and show the play icon instead
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                              onLoad={() => {
                                console.log('✅ Thumbnail loaded successfully:', video.thumbnail_url);
                              }}
                            />
                          ) : null}
                          
                          {/* Always show play icon as fallback */}
                          {!video.thumbnail_url && (
                            <Play className="w-12 h-12 text-muted-foreground" />
                          )}
                          
                          <div className="absolute top-2 left-2 flex gap-1">
                            <Badge className={getStatusColor(video.status)}>
                              {video.status}
                            </Badge>
                            {video.is_public && (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                Public
                              </Badge>
                            )}
                          </div>
                          
                          {video.duration_seconds && (
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                              {formatDuration(video.duration_seconds)}
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-2 line-clamp-2">{video.title}</h3>
                        
                        {video.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {video.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Languages className="w-3 h-3" />
                            {getLanguageDisplay(video.language)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(video.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full">
                          <Button asChild size="sm" className="flex-1">
                            <Link to={`/videos/${video.id}`}>
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Link>
                          </Button>
                          
              <VideoPublishingControls
                videoId={video.id}
                isPublic={video.is_public}
                contentType={video.content_type}
                description={video.description}
                channelId={video.channel_id}
                videoStatus={video.status}
                onUpdate={fetchVideos}
                onDelete={() => deleteVideo(video.id)}
                isDeleting={deletingVideo === video.id}
              />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="channels">
              <ChannelManager />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
}
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play, Calendar, Clock, Languages, Eye, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';

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
}

export default function PublicBoard() {
  const { t } = useTranslation();
  const [videos, setVideos] = useState<PublicVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [contentTypeFilter, setContentTypeFilter] = useState('all');

  useEffect(() => {
    fetchPublicVideos();
  }, []);

  const fetchPublicVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('id, title, description, language, content_type, duration_seconds, thumbnail_url, view_count, published_at, created_at')
        .eq('is_public', true)
        .in('status', ['ready', 'uploaded'])
        .order('published_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching public videos:', error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (video.description && video.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLanguage = languageFilter === 'all' || video.language === languageFilter;
    const matchesContentType = contentTypeFilter === 'all' || video.content_type === contentTypeFilter;
    
    return matchesSearch && matchesLanguage && matchesContentType;
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatViewCount = (count: number) => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
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

  const getContentTypeDisplay = (type: string) => {
    const types: Record<string, string> = {
      'education': 'Educational',
      'recipe': 'Recipe',
      'tutorial': 'Tutorial',
      'presentation': 'Presentation'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('publicBoard.loadingVideos')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Hero Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {t('publicBoard.title')}
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('publicBoard.subtitle')}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <Input
              placeholder={t('publicBoard.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={languageFilter} onValueChange={setLanguageFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder={t('publicBoard.allLanguages')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('publicBoard.allLanguages')}</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
            </SelectContent>
          </Select>

          <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder={t('publicBoard.allContent')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('publicBoard.allContent')}</SelectItem>
              <SelectItem value="education">Educational</SelectItem>
              <SelectItem value="recipe">Recipe</SelectItem>
              <SelectItem value="tutorial">Tutorial</SelectItem>
              <SelectItem value="presentation">Presentation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Videos Grid */}
        {filteredVideos.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">{t('publicBoard.noVideosFound')}</h3>
            <p className="text-muted-foreground mb-4">
              {videos.length === 0 
                ? t('publicBoard.noVideosYet')
                : t('publicBoard.noMatchingVideos')}
            </p>
            <Button asChild variant="outline">
              <Link to="/auth">{t('publicBoard.joinCommunity')}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVideos.map((video) => (
              <Card key={video.id} className="hover:shadow-lg transition-all hover:scale-105 group">
                <CardHeader className="p-0">
                  <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center relative overflow-hidden">
                    {video.thumbnail_url ? (
                      <img 
                        src={video.thumbnail_url} 
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <Play className="w-12 h-12 text-muted-foreground" />
                    )}
                    
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                      <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="bg-primary/80 text-primary-foreground">
                        <Globe className="w-3 h-3 mr-1" />
                        {t('publicBoard.public')}
                      </Badge>
                    </div>
                    
                    {video.duration_seconds && (
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {formatDuration(video.duration_seconds)}
                      </div>
                    )}

                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {formatViewCount(video.view_count)}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {video.title}
                  </h3>
                  
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
                      <Badge variant="outline" className="text-xs">
                        {getContentTypeDisplay(video.content_type)}
                      </Badge>
                    </div>
                  </div>

                    <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {t('publicBoard.published')} {new Date(video.published_at).toLocaleDateString()}
                    </div>
                  
                    <Button asChild className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Link to={`/watch/${video.id}`}>
                        <Play className="w-4 h-4 mr-2" />
                        {t('publicBoard.watchVideo')}
                      </Link>
                    </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Call to Action */}
        {videos.length > 0 && (
          <div className="text-center mt-16 py-12 bg-muted/30 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">{t('publicBoard.ctaTitle')}</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              {t('publicBoard.ctaDescription')}
            </p>
            <Button asChild size="lg">
              <Link to="/auth">{t('publicBoard.getStarted')}</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
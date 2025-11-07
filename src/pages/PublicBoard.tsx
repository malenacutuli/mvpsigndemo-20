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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-light">{t('publicBoard.loadingVideos')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {/* Hero Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light text-foreground mb-6 leading-tight">
            {t('publicBoard.title')}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground font-light max-w-3xl mx-auto leading-relaxed">
            {t('publicBoard.subtitle')}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-12 max-w-5xl mx-auto">
          <div className="flex-1">
            <Input
              placeholder={t('publicBoard.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 rounded-full font-light text-base"
            />
          </div>
          
          <Select value={languageFilter} onValueChange={setLanguageFilter}>
            <SelectTrigger className="w-full md:w-56 h-12 rounded-full font-light">
              <SelectValue placeholder={t('publicBoard.allLanguages')} />
            </SelectTrigger>
            <SelectContent className="bg-card border shadow-lg rounded-2xl z-50">
              <SelectItem value="all" className="font-light">{t('publicBoard.allLanguages')}</SelectItem>
              <SelectItem value="en" className="font-light">English</SelectItem>
              <SelectItem value="es" className="font-light">Spanish</SelectItem>
              <SelectItem value="fr" className="font-light">French</SelectItem>
              <SelectItem value="de" className="font-light">German</SelectItem>
            </SelectContent>
          </Select>

          <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
            <SelectTrigger className="w-full md:w-56 h-12 rounded-full font-light">
              <SelectValue placeholder={t('publicBoard.allContent')} />
            </SelectTrigger>
            <SelectContent className="bg-card border shadow-lg rounded-2xl z-50">
              <SelectItem value="all" className="font-light">{t('publicBoard.allContent')}</SelectItem>
              <SelectItem value="education" className="font-light">Educational</SelectItem>
              <SelectItem value="recipe" className="font-light">Recipe</SelectItem>
              <SelectItem value="tutorial" className="font-light">Tutorial</SelectItem>
              <SelectItem value="presentation" className="font-light">Presentation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Videos Grid */}
        {filteredVideos.length === 0 ? (
          <div className="text-center py-20">
            <Globe className="w-20 h-20 mx-auto mb-6 text-muted-foreground" />
            <h3 className="text-2xl md:text-3xl font-light text-foreground mb-4">{t('publicBoard.noVideosFound')}</h3>
            <p className="text-lg text-muted-foreground font-light mb-8 leading-relaxed max-w-md mx-auto">
              {videos.length === 0 
                ? t('publicBoard.noVideosYet')
                : t('publicBoard.noMatchingVideos')}
            </p>
            <Button asChild variant="outline" size="lg" className="rounded-full px-8 py-6 text-lg font-light">
              <Link to="/auth">{t('publicBoard.joinCommunity')}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredVideos.map((video) => (
              <Card key={video.id} className="hover:shadow-elegant transition-all duration-300 hover:scale-105 group border rounded-2xl shadow-soft overflow-hidden">
                <CardHeader className="p-0">
                  <div className="aspect-video bg-muted rounded-t-2xl flex items-center justify-center relative overflow-hidden">
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
                    
                    <div className="absolute top-3 left-3">
                      <Badge variant="secondary" className="bg-primary/90 text-primary-foreground font-light rounded-full px-3 py-1">
                        <Globe className="w-3 h-3 mr-1" />
                        {t('publicBoard.public')}
                      </Badge>
                    </div>
                    
                    {video.duration_seconds && (
                      <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs font-light px-3 py-1.5 rounded-full">
                        {formatDuration(video.duration_seconds)}
                      </div>
                    )}

                    <div className="absolute bottom-3 left-3 bg-black/80 text-white text-xs font-light px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <Eye className="w-3 h-3" />
                      {formatViewCount(video.view_count)}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  <h3 className="font-light text-lg text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                    {video.title}
                  </h3>
                  
                  {video.description && (
                    <p className="text-sm text-muted-foreground font-light mb-4 line-clamp-2 leading-relaxed">
                      {video.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-light mb-4">
                    <div className="flex items-center gap-1.5">
                      <Languages className="w-3 h-3" />
                      {getLanguageDisplay(video.language)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-xs font-light rounded-full">
                        {getContentTypeDisplay(video.content_type)}
                      </Badge>
                    </div>
                  </div>

                    <div className="text-xs text-muted-foreground font-light mb-4 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {t('publicBoard.published')} {new Date(video.published_at).toLocaleDateString()}
                    </div>
                  
                    <Button asChild className="w-full font-light rounded-full group-hover:shadow-md transition-all">
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
          <div className="text-center mt-20 py-16 bg-muted/20 rounded-2xl border shadow-soft">
            <h2 className="text-3xl md:text-4xl font-light text-foreground mb-6">{t('publicBoard.ctaTitle')}</h2>
            <p className="text-lg text-muted-foreground font-light mb-8 max-w-2xl mx-auto leading-relaxed">
              {t('publicBoard.ctaDescription')}
            </p>
            <Button asChild size="lg" className="px-10 py-6 text-lg font-light rounded-full">
              <Link to="/auth">{t('publicBoard.getStarted')}</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
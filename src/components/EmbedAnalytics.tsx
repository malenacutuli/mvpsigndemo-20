import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, Clock, Globe, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EmbedAnalyticsProps {
  videoId: string;
}

interface AnalyticsData {
  total_views: number;
  total_watch_time: number;
  avg_watch_time: number;
  top_domains: Array<{ domain: string; views: number }>;
  recent_views: Array<{
    id: string;
    referrer_domain: string;
    duration_watched: number;
    created_at: string;
    user_agent: string;
  }>;
}

export const EmbedAnalytics: React.FC<EmbedAnalyticsProps> = ({ videoId }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    loadAnalytics();
  }, [videoId, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const startDate = new Date();
      switch (timeRange) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
      }

      // Get analytics data
      const { data: analyticsData, error } = await supabase
        .from('embed_analytics')
        .select('*')
        .eq('video_id', videoId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (analyticsData) {
        // Process analytics data
        const totalViews = analyticsData.length;
        const totalWatchTime = analyticsData.reduce((sum, item) => 
          sum + (item.duration_watched || 0), 0
        );
        const avgWatchTime = totalViews > 0 ? totalWatchTime / totalViews : 0;

        // Group by domain
        const domainCounts = analyticsData.reduce((acc, item) => {
          const domain = item.referrer_domain || 'direct';
          acc[domain] = (acc[domain] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const topDomains = Object.entries(domainCounts)
          .map(([domain, views]) => ({ domain, views }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 5);

        const recentViews = analyticsData.slice(0, 10).map(item => ({
          id: item.id,
          referrer_domain: item.referrer_domain || 'direct',
          duration_watched: item.duration_watched || 0,
          created_at: item.created_at,
          user_agent: item.user_agent || 'unknown'
        }));

        setAnalytics({
          total_views: totalViews,
          total_watch_time: totalWatchTime,
          avg_watch_time: avgWatchTime,
          top_domains: topDomains,
          recent_views: recentViews
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getDeviceType = (userAgent: string) => {
    if (userAgent.includes('Mobile')) return 'Mobile';
    if (userAgent.includes('Tablet') || userAgent.includes('iPad')) return 'Tablet';
    return 'Desktop';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Embed Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Embed Analytics
          </CardTitle>
          <div className="flex items-center gap-2">
            <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
              <TabsList>
                <TabsTrigger value="7d">7 days</TabsTrigger>
                <TabsTrigger value="30d">30 days</TabsTrigger>
                <TabsTrigger value="90d">90 days</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={loadAnalytics}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {analytics ? (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Views</p>
                      <p className="text-2xl font-bold">{analytics.total_views}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Watch Time</p>
                      <p className="text-2xl font-bold">{formatDuration(analytics.total_watch_time)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Watch Time</p>
                      <p className="text-2xl font-bold">{formatDuration(analytics.avg_watch_time)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="domains">
              <TabsList>
                <TabsTrigger value="domains">Top Domains</TabsTrigger>
                <TabsTrigger value="recent">Recent Views</TabsTrigger>
              </TabsList>

              <TabsContent value="domains" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Top Referring Domains
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.top_domains.length > 0 ? (
                      <div className="space-y-3">
                        {analytics.top_domains.map((domain, index) => (
                          <div key={domain.domain} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">#{index + 1}</Badge>
                              <span className="font-medium">{domain.domain}</span>
                            </div>
                            <Badge variant="secondary">{domain.views} views</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No domain data available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recent" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Views</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.recent_views.length > 0 ? (
                      <div className="space-y-3">
                        {analytics.recent_views.map((view) => (
                          <div key={view.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline">{view.referrer_domain}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatDateTime(view.created_at)}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Watch time: {formatDuration(view.duration_watched)}</span>
                              <span>Device: {getDeviceType(view.user_agent)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No recent views</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No analytics data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
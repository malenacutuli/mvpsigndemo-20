import React from 'react';
import { Navigation } from '@/components/Navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { StorageIndicator } from '@/components/StorageIndicator';
import { SubscriptionManager } from '@/components/SubscriptionManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import uploadVideoIcon from '@/assets/upload-video-icon.jpg';

const Dashboard = () => {
  const { t } = useTranslation();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <main className="container mx-auto px-6 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-4 gap-8">
              {/* Main content area */}
              <div className="lg:col-span-3 space-y-12">
                {/* Header */}
                <div className="text-center">
                  <h1 className="text-4xl md:text-5xl font-light text-foreground mb-4 leading-tight">
                    {t('dashboard.title')}
                  </h1>
                  <p className="text-xl text-muted-foreground font-light max-w-3xl mx-auto leading-relaxed">
                    {t('dashboard.subtitle')}
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  <Link to="/upload" className="group">
                    <Card className="hover:shadow-elegant transition-all duration-300 group-hover:scale-105 shadow-soft">
                      <CardHeader className="text-center pb-4">
                        <div className="w-20 h-20 flex items-center justify-center mb-6 mx-auto">
                          <img src={uploadVideoIcon} alt="Upload video" className="w-20 h-20 object-contain" />
                        </div>
                        <CardTitle className="text-2xl font-light text-foreground">{t('dashboard.uploadVideo.title')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground text-center font-light leading-relaxed">
                          {t('dashboard.uploadVideo.description')}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                  
                  <Link to="/videos" className="group">
                    <Card className="hover:shadow-elegant transition-all duration-300 group-hover:scale-105 shadow-soft">
                      <CardHeader className="text-center pb-4">
                        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:bg-primary/20 transition-colors">
                          <Video className="w-10 h-10 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-light text-foreground">{t('dashboard.myVideos.title')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground text-center font-light leading-relaxed">
                          {t('dashboard.myVideos.description')}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-8 space-y-6">
                  <div className="min-w-0">
                    <SubscriptionManager />
                  </div>
                  <div className="min-w-0">
                    <StorageIndicator />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UploadVideo } from '@/components/UploadVideo';
import { Navigation } from '@/components/Navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Target, Volume2, HandMetal } from 'lucide-react';

export default function Upload() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleUploadComplete = (videoId: string) => {
    navigate(`/videos/${videoId}`);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-light mb-4 text-foreground leading-tight">
                {t('upload.pageTitle')}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
                {t('upload.pageSubtitle')}
              </p>
            </div>

            <UploadVideo onUploadComplete={handleUploadComplete} />

            {/* Feature Benefits */}
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-card rounded-lg border">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-light text-lg mb-2">{t('upload.features.captions.title')}</h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  {t('upload.features.captions.description')}
                </p>
              </div>

              <div className="text-center p-6 bg-card rounded-lg border">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Volume2 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-light text-lg mb-2">{t('upload.features.audioDescriptions.title')}</h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  {t('upload.features.audioDescriptions.description')}
                </p>
              </div>

              <div className="text-center p-6 bg-card rounded-lg border">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <HandMetal className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-light text-lg mb-2">{t('upload.features.asl.title')}</h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  {t('upload.features.asl.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
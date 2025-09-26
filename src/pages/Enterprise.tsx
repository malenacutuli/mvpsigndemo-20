import { Hero } from '@/components/Hero';
import { FeatureBoxes } from '@/components/FeatureBoxes';
import { IndustryFirst } from '@/components/IndustryFirst';
import { MarketUrgency } from '@/components/MarketUrgency';
import { Implementation } from '@/components/Implementation';
import { EarlyAccess } from '@/components/EarlyAccess';
import { TechStack } from '@/components/TechStack';
import { PatentClaims } from '@/components/PatentClaims';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Upload, Video, DollarSign } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { useTranslation } from 'react-i18next';

const Enterprise = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <Hero />
      <FeatureBoxes />

      {/* Industry First Content */}
      <IndustryFirst />
      <Implementation />

      {/* Quick Access Section */}
      <section className="py-32 bg-muted/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-light text-foreground mb-8 leading-tight">
              {t('enterprise.quickAccess.title')}
            </h2>
            <p className="text-lg text-muted-foreground font-light max-w-3xl mx-auto leading-relaxed">
              {t('enterprise.quickAccess.subtitle')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto">
            <Link to="/explore" className="group">
              <div className="bg-card rounded-2xl p-8 border shadow-soft hover:shadow-elegant transition-shadow text-center space-y-6">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                  <Video className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-light text-foreground">{t('enterprise.quickAccess.exploreVideos.title')}</h3>
                <p className="text-muted-foreground font-light leading-relaxed">
                  {t('enterprise.quickAccess.exploreVideos.description')}
                </p>
              </div>
            </Link>
            
            <Link to="/upload" className="group">
              <div className="bg-card rounded-2xl p-8 border shadow-soft hover:shadow-elegant transition-shadow text-center space-y-6">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                  <Upload className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-light text-foreground">{t('enterprise.quickAccess.uploadVideo.title')}</h3>
                <p className="text-muted-foreground font-light leading-relaxed">
                  {t('enterprise.quickAccess.uploadVideo.description')}
                </p>
              </div>
            </Link>
            
            <Link to="/videos" className="group">
              <div className="bg-card rounded-2xl p-8 border shadow-soft hover:shadow-elegant transition-shadow text-center space-y-6">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                  <DollarSign className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-light text-foreground">{t('enterprise.quickAccess.manageVideos.title')}</h3>
                <p className="text-muted-foreground font-light leading-relaxed">
                  {t('enterprise.quickAccess.manageVideos.description')}
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>
      
      <TechStack />
      <PatentClaims />
      <MarketUrgency />
    </div>
  );
};

export default Enterprise;
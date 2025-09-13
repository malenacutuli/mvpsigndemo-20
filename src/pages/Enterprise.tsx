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
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4 tracking-tight">
              {t('enterprise.quickAccess.title')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              {t('enterprise.quickAccess.subtitle')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Link to="/explore" className="group">
              <div className="bg-card rounded-xl p-6 border hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Video className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-center">{t('enterprise.quickAccess.exploreVideos.title')}</h3>
                <p className="text-muted-foreground text-center text-sm">
                  {t('enterprise.quickAccess.exploreVideos.description')}
                </p>
              </div>
            </Link>
            
            <Link to="/upload" className="group">
              <div className="bg-card rounded-xl p-6 border hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-center">{t('enterprise.quickAccess.uploadVideo.title')}</h3>
                <p className="text-muted-foreground text-center text-sm">
                  {t('enterprise.quickAccess.uploadVideo.description')}
                </p>
              </div>
            </Link>
            
            <Link to="/videos" className="group">
              <div className="bg-card rounded-xl p-6 border hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-center">{t('enterprise.quickAccess.manageVideos.title')}</h3>
                <p className="text-muted-foreground text-center text-sm">
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
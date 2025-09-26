import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const FeatureBoxes: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <section className="py-32 bg-background">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto mb-20">
          {/* Compliance Box */}
          <div className="bg-card rounded-2xl p-8 border shadow-soft hover:shadow-elegant transition-shadow text-left">
            <h3 className="text-2xl font-light text-foreground mb-6">
              {t('featureBoxes.compliance.title')}
            </h3>
            <p className="text-muted-foreground font-light leading-relaxed">
              {t('featureBoxes.compliance.description')}
            </p>
          </div>
          
          {/* Custom Solutions Box */}
          <div className="bg-card rounded-2xl p-8 border shadow-soft hover:shadow-elegant transition-shadow text-left">
            <h3 className="text-2xl font-light text-foreground mb-6">
              {t('featureBoxes.solutions.title')}
            </h3>
            <p className="text-muted-foreground font-light leading-relaxed">
              {t('featureBoxes.solutions.description')}
            </p>
          </div>
          
          {/* Heavy Lifting Box */}
          <div className="bg-card rounded-2xl p-8 border shadow-soft hover:shadow-elegant transition-shadow text-left">
            <h3 className="text-2xl font-light text-foreground mb-6">
              {t('featureBoxes.heavyWork.title')}
            </h3>
            <p className="text-muted-foreground font-light leading-relaxed">
              {t('featureBoxes.heavyWork.description')}
            </p>
          </div>
        </div>
        
        {/* Contact CTA */}
        <div className="text-center">
          <Button asChild size="lg" className="px-10 py-6 text-lg font-light rounded-full h-auto inline-flex items-center gap-2">
            <Link to="/pricing">
              {t('featureBoxes.contactUs')}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
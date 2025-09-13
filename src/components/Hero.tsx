import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const Hero: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <section className="relative bg-white py-20 lg:py-32 overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto text-center">
          {/* Subtitle */}
          <p className="text-sm md:text-base text-muted-foreground uppercase tracking-wider mb-6 font-medium">
            {t('hero.subtitle')}
          </p>
          
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black text-foreground leading-tight mb-8">
            {t('hero.headline')}
            <span className="block">{t('hero.headlineSecond')}</span>
          </h1>
          
          {/* Description */}
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-12 px-4">
            {t('hero.description')}
          </p>
          
          {/* CTA Button */}
          <Link to="/upload">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg font-semibold rounded-full inline-flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {t('hero.cta')}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          
          {/* Inclusivity Message */}
          <div className="mt-16 max-w-3xl mx-auto px-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-4">
              {t('hero.inclusivity.title')}
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              {t('hero.inclusivity.description')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
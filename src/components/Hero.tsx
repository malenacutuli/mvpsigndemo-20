import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';

export const Hero: React.FC = () => {
  const { t } = useTranslation();
  const { theme, isDemo, getPath } = useTheme();
  
  return (
    <section className="relative bg-background py-20 sm:py-28 lg:py-40 overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto text-center">
          {/* Subtitle */}
          <p className="text-sm md:text-base text-muted-foreground uppercase tracking-wider mb-6 font-light">
            {isDemo ? theme.tagline : t('hero.subtitle')}
          </p>
          
          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-foreground leading-tight mb-8 px-2 max-w-4xl mx-auto">
            {isDemo ? theme.heroTitle : t('hero.headline')}
            {!isDemo && <span className="block">{t('hero.headlineSecond')}</span>}
          </h1>
          
          {/* Description */}
          <p className="text-base sm:text-lg md:text-xl text-foreground font-light max-w-3xl mx-auto leading-relaxed mb-10 px-4">
            {isDemo ? theme.heroSubtitle : t('hero.description')}
          </p>
          
          {/* CTA Button */}
          <Button asChild size="lg" className="px-10 py-6 text-lg font-light rounded-full h-auto inline-flex items-center gap-2">
            <Link to={getPath('/upload')}>
              {isDemo ? theme.ctaText : t('hero.cta')}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
          
          {/* Powered by badge for demos */}
          {isDemo && (
            <p className="mt-8 text-sm text-muted-foreground">
              Powered by <span className="text-primary font-medium">Axessible</span>
            </p>
          )}
          
          {/* Inclusivity Message */}
          <div className="mt-20 max-w-3xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-light text-foreground mb-4">
              {t('hero.inclusivity.title')}
            </h2>
            <p className="text-lg text-muted-foreground font-light leading-relaxed">
              {t('hero.inclusivity.description')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
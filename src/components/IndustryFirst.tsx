import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Brain, Users, Building } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const IndustryFirst: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <section className="py-32 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <Badge variant="secondary" className="mb-4 text-sm font-light px-4 py-2">
            {t('industryFirst.badge')}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-light text-foreground mb-8 leading-tight">
            {t('industryFirst.title')}
          </h2>
          <p className="text-xl text-muted-foreground font-light max-w-3xl mx-auto leading-relaxed">
            {t('industryFirst.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 mb-20">
          <Card className="bg-card border shadow-soft hover:shadow-elegant transition-shadow">
            <CardContent className="p-8 text-center space-y-6">
              <Zap className="w-12 h-12 text-primary mx-auto" />
              <h3 className="text-2xl font-light">{t('industryFirst.features.aiSync.title')}</h3>
              <p className="text-muted-foreground font-light leading-relaxed">
                {t('industryFirst.features.aiSync.description')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border shadow-soft hover:shadow-elegant transition-shadow">
            <CardContent className="p-8 text-center space-y-6">
              <Brain className="w-12 h-12 text-accent mx-auto" />
              <h3 className="text-2xl font-light">{t('industryFirst.features.emotionalCaptions.title')}</h3>
              <p className="text-muted-foreground font-light leading-relaxed">
                {t('industryFirst.features.emotionalCaptions.description')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border shadow-soft hover:shadow-elegant transition-shadow">
            <CardContent className="p-8 text-center space-y-6">
              <Building className="w-12 h-12 text-primary mx-auto" />
              <h3 className="text-2xl font-light">{t('industryFirst.features.enterprise.title')}</h3>
              <div className="text-muted-foreground text-left">
                <ul className="space-y-3 text-sm font-light">
                  <li>• {t('industryFirst.features.enterprise.compliance')}</li>
                  <li>• {t('industryFirst.features.enterprise.whiteLabel')}</li>
                  <li>• {t('industryFirst.features.enterprise.sso')}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <blockquote className="text-2xl md:text-3xl font-light text-foreground italic">
            {t('industryFirst.quote')}
          </blockquote>
        </div>
      </div>
    </section>
  );
};
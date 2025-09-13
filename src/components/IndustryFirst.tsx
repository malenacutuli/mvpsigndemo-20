import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Brain, Users, Building } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const IndustryFirst: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 text-sm font-medium px-4 py-2">
            {t('industryFirst.badge')}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            {t('industryFirst.title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            {t('industryFirst.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
            <CardContent className="p-8 text-center">
              <Zap className="w-12 h-12 text-primary mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-3">{t('industryFirst.features.aiSync.title')}</h3>
              <p className="text-muted-foreground">
                {t('industryFirst.features.aiSync.description')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
            <CardContent className="p-8 text-center">
              <Brain className="w-12 h-12 text-accent mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-3">{t('industryFirst.features.emotionalCaptions.title')}</h3>
              <p className="text-muted-foreground">
                {t('industryFirst.features.emotionalCaptions.description')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
            <CardContent className="p-8 text-center">
              <Building className="w-12 h-12 text-primary mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-3">{t('industryFirst.features.enterprise.title')}</h3>
              <div className="text-muted-foreground text-left">
                <ul className="space-y-2 text-sm">
                  <li>• {t('industryFirst.features.enterprise.compliance')}</li>
                  <li>• {t('industryFirst.features.enterprise.whiteLabel')}</li>
                  <li>• {t('industryFirst.features.enterprise.apiFirst')}</li>
                  <li>• {t('industryFirst.features.enterprise.sso')}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <blockquote className="text-2xl md:text-3xl font-bold text-foreground italic">
            {t('industryFirst.quote')}
          </blockquote>
        </div>
      </div>
    </section>
  );
};
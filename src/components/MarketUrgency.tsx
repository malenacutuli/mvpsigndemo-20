import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertCircle, Calendar, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const MarketUrgency: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <section className="py-32 bg-muted/20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <Badge variant="secondary" className="mb-4 text-sm font-light px-4 py-2">
            {t('marketUrgency.badge')}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-light text-foreground mb-8 leading-tight">
            {t('marketUrgency.title')}
          </h2>
          <p className="text-xl text-muted-foreground font-light max-w-3xl mx-auto leading-relaxed">
            {t('marketUrgency.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-10 mb-20">
          <Card className="bg-card border shadow-soft hover:shadow-elegant transition-shadow">
            <CardContent className="p-8 text-center space-y-4">
              <div className="text-5xl font-light text-destructive">89%</div>
              <h3 className="text-2xl font-light">{t('marketUrgency.stats.userIssues.title')}</h3>
              <p className="text-muted-foreground font-light leading-relaxed">
                {t('marketUrgency.stats.userIssues.description')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border shadow-soft hover:shadow-elegant transition-shadow">
            <CardContent className="p-8 text-center space-y-4">
              <div className="text-5xl font-light text-destructive">42%</div>
              <h3 className="text-2xl font-light">{t('marketUrgency.stats.brandAbandonment.title')}</h3>
              <p className="text-muted-foreground font-light leading-relaxed">
                {t('marketUrgency.stats.brandAbandonment.description')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border shadow-soft hover:shadow-elegant transition-shadow">
            <CardContent className="p-8 text-center space-y-4">
              <div className="text-2xl font-light text-destructive">{t('marketUrgency.stats.eaaEnforcement.date')}</div>
              <h3 className="text-2xl font-light">{t('marketUrgency.stats.eaaEnforcement.title')}</h3>
              <p className="text-muted-foreground font-light leading-relaxed">
                {t('marketUrgency.stats.eaaEnforcement.description')}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mb-16">
          <h3 className="text-3xl md:text-4xl font-light text-foreground mb-8">
            {t('marketUrgency.solution.title')}
          </h3>
          <p className="text-xl text-muted-foreground font-light max-w-4xl mx-auto leading-relaxed">
            {t('marketUrgency.solution.description')}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          <Badge variant="outline" className="text-lg px-6 py-3 bg-card font-light">
            <Shield className="w-5 h-5 mr-2" />
            {t('marketUrgency.compliance.wcag')}
          </Badge>
          <Badge variant="outline" className="text-lg px-6 py-3 bg-card font-light">
            <Shield className="w-5 h-5 mr-2" />
            {t('marketUrgency.compliance.ada')}
          </Badge>
          <Badge variant="outline" className="text-lg px-6 py-3 bg-card font-light">
            <Shield className="w-5 h-5 mr-2" />
            {t('marketUrgency.compliance.eaa')}
          </Badge>
          <Badge variant="outline" className="text-lg px-6 py-3 bg-card font-light">
            <Shield className="w-5 h-5 mr-2" />
            {t('marketUrgency.compliance.section508')}
          </Badge>
        </div>
      </div>
    </section>
  );
};
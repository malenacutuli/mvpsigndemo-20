import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertCircle, Calendar, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const MarketUrgency: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 text-sm font-medium px-4 py-2">
            {t('marketUrgency.badge')}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            {t('marketUrgency.title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            {t('marketUrgency.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="bg-card border border-border">
            <CardContent className="p-8 text-center">
              <div className="text-5xl font-bold text-destructive mb-2">89%</div>
              <h3 className="text-xl font-semibold mb-3">{t('marketUrgency.stats.userIssues.title')}</h3>
              <p className="text-muted-foreground">
                {t('marketUrgency.stats.userIssues.description')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="p-8 text-center">
              <div className="text-5xl font-bold text-destructive mb-2">42%</div>
              <h3 className="text-xl font-semibold mb-3">{t('marketUrgency.stats.brandAbandonment.title')}</h3>
              <p className="text-muted-foreground">
                {t('marketUrgency.stats.brandAbandonment.description')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="p-8 text-center">
              <div className="text-2xl font-bold text-destructive mb-2">{t('marketUrgency.stats.eaaEnforcement.date')}</div>
              <h3 className="text-xl font-semibold mb-3">{t('marketUrgency.stats.eaaEnforcement.title')}</h3>
              <p className="text-muted-foreground">
                {t('marketUrgency.stats.eaaEnforcement.description')}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mb-12">
          <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            {t('marketUrgency.solution.title')}
          </h3>
          <p className="text-xl text-muted-foreground max-w-5xl mx-auto leading-relaxed">
            {t('marketUrgency.solution.description')}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          <Badge variant="outline" className="text-lg px-6 py-3 bg-card">
            <Shield className="w-5 h-5 mr-2" />
            {t('marketUrgency.compliance.wcag')}
          </Badge>
          <Badge variant="outline" className="text-lg px-6 py-3 bg-card">
            <Shield className="w-5 h-5 mr-2" />
            {t('marketUrgency.compliance.ada')}
          </Badge>
          <Badge variant="outline" className="text-lg px-6 py-3 bg-card">
            <Shield className="w-5 h-5 mr-2" />
            {t('marketUrgency.compliance.eaa')}
          </Badge>
          <Badge variant="outline" className="text-lg px-6 py-3 bg-card">
            <Shield className="w-5 h-5 mr-2" />
            {t('marketUrgency.compliance.section508')}
          </Badge>
        </div>
      </div>
    </section>
  );
};
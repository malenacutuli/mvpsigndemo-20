import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Settings, Rocket } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const Implementation: React.FC = () => {
  const { t } = useTranslation();
  
  const steps = [
    {
      number: '1',
      icon: Upload,
      title: t('implementation.steps.contentInput.title'),
      description: t('implementation.steps.contentInput.description'),
      features: t('implementation.steps.contentInput.features', { returnObjects: true }) as string[]
    },
    {
      number: '2',
      icon: Settings,
      title: t('implementation.steps.featureSelection.title'),
      description: t('implementation.steps.featureSelection.description'),  
      features: t('implementation.steps.featureSelection.features', { returnObjects: true }) as string[]
    },
    {
      number: '3',
      icon: Rocket,
      title: t('implementation.steps.deployMonitor.title'),
      description: t('implementation.steps.deployMonitor.description'),
      features: t('implementation.steps.deployMonitor.features', { returnObjects: true }) as string[]
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 text-sm font-medium px-4 py-2">
            {t('implementation.badge')}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            {t('implementation.title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            {t('implementation.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => (
            <Card key={step.number} className="bg-card/50 backdrop-blur-sm border border-border/50 relative">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary-foreground">{step.number}</span>
                  </div>
                  <step.icon className="w-8 h-8 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-muted-foreground mb-6">{step.description}</p>
                </div>
                
                <div className="space-y-3">
                  {step.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center text-sm text-muted-foreground">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                      {feature}
                    </div>
                  ))}
                </div>
              </CardContent>
              
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-border transform -translate-y-1/2"></div>
              )}
            </Card>
          ))}
        </div>

        <div className="text-center space-y-4">
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center">
              <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
              {t('implementation.highlights.zeroCode')}
            </span>
            <span className="flex items-center">
              <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
              {t('implementation.highlights.userToggleable')}
            </span>
            <span className="flex items-center">
              <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
              {t('implementation.highlights.enterpriseSSO')}
            </span>
          </div>
          
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            {t('implementation.deployMessage')}
          </p>
        </div>
      </div>
    </section>
  );
};
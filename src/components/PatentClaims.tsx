import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Workflow, HandHelping, Shield, ArrowRight, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const PatentClaims: React.FC = () => {
  const { t } = useTranslation();
  
  const patentClaims = [
    {
      icon: <Workflow className="w-6 h-6" />,
      number: t('patentClaims.claims.dataProcessing.number'),
      title: t('patentClaims.claims.dataProcessing.title'),
      description: t('patentClaims.claims.dataProcessing.description'),
      validatedBy: t('patentClaims.claims.dataProcessing.validatedBy', { returnObjects: true }) as string[],
      implementation: t('patentClaims.claims.dataProcessing.implementation')
    },
    {
      icon: <HandHelping className="w-6 h-6" />,
      number: t('patentClaims.claims.avatarGeneration.number'),
      title: t('patentClaims.claims.avatarGeneration.title'),
      description: t('patentClaims.claims.avatarGeneration.description'),
      validatedBy: t('patentClaims.claims.avatarGeneration.validatedBy', { returnObjects: true }) as string[],
      implementation: t('patentClaims.claims.avatarGeneration.implementation')
    },
    {
      icon: <Shield className="w-6 h-6" />,
      number: t('patentClaims.claims.complianceLayer.number'),
      title: t('patentClaims.claims.complianceLayer.title'),
      description: t('patentClaims.claims.complianceLayer.description'),
      validatedBy: t('patentClaims.claims.complianceLayer.validatedBy', { returnObjects: true }) as string[],
      implementation: t('patentClaims.claims.complianceLayer.implementation')
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Award className="w-4 h-4 mr-2" />
            {t('patentClaims.badge')}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t('patentClaims.title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('patentClaims.description')}
          </p>
        </div>

        {/* Patent Claims Grid */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto mb-16">
          {patentClaims.map((claim, index) => (
            <Card key={index} className="bg-card border-border hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {claim.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{claim.title}</CardTitle>
                  </div>
                </div>
                <CardDescription>{claim.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    {t('patentClaims.validatedBy')}
                  </h4>
                  <ul className="space-y-2">
                    {claim.validatedBy.map((validation, vIndex) => (
                      <li key={vIndex} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{validation}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground italic">
                      {claim.implementation}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Strategic Importance */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{t('patentClaims.strategicImportance.title')}</CardTitle>
              <CardDescription className="text-base">
                {t('patentClaims.strategicImportance.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ArrowRight className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-semibold mb-2">{t('patentClaims.strategicImportance.differentiation.title')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('patentClaims.strategicImportance.differentiation.description')}
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-6 h-6 text-accent" />
                  </div>
                  <h4 className="font-semibold mb-2">{t('patentClaims.strategicImportance.protection.title')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('patentClaims.strategicImportance.protection.description')}
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-cwi-main-green/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Award className="w-6 h-6 text-cwi-main-green" />
                  </div>
                  <h4 className="font-semibold mb-2">{t('patentClaims.strategicImportance.investment.title')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('patentClaims.strategicImportance.investment.description')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
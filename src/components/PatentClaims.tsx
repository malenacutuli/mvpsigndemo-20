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
      icon: <Shield className="w-6 h-6" />,
      number: t('patentClaims.claims.complianceLayer.number'),
      title: t('patentClaims.claims.complianceLayer.title'),
      description: t('patentClaims.claims.complianceLayer.description'),
      validatedBy: t('patentClaims.claims.complianceLayer.validatedBy', { returnObjects: true }) as string[],
      implementation: t('patentClaims.claims.complianceLayer.implementation')
    }
  ];

  return (
    <section className="py-32 bg-background">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-20">
          <Badge variant="secondary" className="mb-4 text-sm font-light px-4 py-2">
            <Award className="w-4 h-4 mr-2" />
            {t('patentClaims.badge')}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-light text-foreground mb-8 leading-tight">
            {t('patentClaims.title')}
          </h2>
          <p className="text-xl text-muted-foreground font-light max-w-3xl mx-auto leading-relaxed">
            {t('patentClaims.description')}
          </p>
        </div>

        {/* Patent Claims Grid */}
        <div className="grid lg:grid-cols-2 gap-10 max-w-5xl mx-auto">
          {patentClaims.map((claim, index) => (
            <Card key={index} className="bg-card border shadow-soft hover:shadow-elegant transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {claim.icon}
                  </div>
                  <div>
                    <CardTitle className="text-xl font-light">{claim.title}</CardTitle>
                  </div>
                </div>
                <CardDescription className="font-light">{claim.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h4 className="font-light text-sm text-muted-foreground uppercase tracking-wide">
                    {t('patentClaims.validatedBy')}
                  </h4>
                  <ul className="space-y-3">
                    {claim.validatedBy.map((validation, vIndex) => (
                      <li key={vIndex} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="font-light">{validation}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground font-light italic">
                      {claim.implementation}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
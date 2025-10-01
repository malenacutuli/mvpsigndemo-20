import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

const getPlanData = (t: any) => [
  {
    key: "starter",
    name: t('pricing.plans.starter.name'),
    price: t('pricing.plans.starter.price'),
    cadence: t('pricing.plans.starter.cadence'),
    trial: t('pricing.plans.starter.trial'),
    users: t('pricing.plans.starter.users'),
    storage: t('pricing.plans.starter.storage'),
    features: t('pricing.plans.starter.features', { returnObjects: true }),
    cta: t('pricing.plans.starter.cta'),
    highlight: false
  },
  {
    key: "standard",
    name: t('pricing.plans.standard.name'),
    price: t('pricing.plans.standard.price'),
    cadence: t('pricing.plans.standard.cadence'),
    users: t('pricing.plans.standard.users'),
    storage: t('pricing.plans.standard.storage'),
    features: t('pricing.plans.standard.features', { returnObjects: true }),
    cta: t('pricing.plans.standard.cta'),
    highlight: false
  },
  {
    key: "advanced",
    name: t('pricing.plans.advanced.name'),
    price: t('pricing.plans.advanced.price'),
    cadence: t('pricing.plans.advanced.cadence'),
    users: t('pricing.plans.advanced.users'),
    storage: t('pricing.plans.advanced.storage'),
    features: t('pricing.plans.advanced.features', { returnObjects: true }),
    cta: t('pricing.plans.advanced.cta'),
    highlight: true
  },
  {
    key: "enterprise",
    name: t('pricing.plans.enterprise.name'),
    price: t('pricing.plans.enterprise.price'),
    cadence: t('pricing.plans.enterprise.cadence'),
    users: t('pricing.plans.enterprise.users'),
    storage: t('pricing.plans.enterprise.storage'),
    features: t('pricing.plans.enterprise.features', { returnObjects: true }),
    cta: t('pricing.plans.enterprise.cta'),
    highlight: false
  }
];

const getComparisonFeatures = (t: any) => [
  {
    category: t('pricing.comparison.categories.accessibilityFeatures'),
    features: [
      {
        name: t('pricing.comparison.features.axessiblePlayer'),
        starter: true,
        standard: true,
        advanced: true,
        enterprise: true
      },
      {
        name: t('pricing.comparison.features.emotionTaggedCaptions'),
        starter: true,
        standard: true,
        advanced: true,
        enterprise: true
      },
      {
        name: t('pricing.comparison.features.aiAudioDescriptions'),
        starter: t('pricing.comparison.values.basic'),
        standard: t('pricing.comparison.values.advanced'),
        advanced: t('pricing.comparison.values.advanced'),
        enterprise: t('pricing.comparison.values.custom')
      },
      {
        name: t('pricing.comparison.features.signLanguageAvatarSupport'),
        starter: false,
        standard: false,
        advanced: false,
        enterprise: t('pricing.comparison.values.custom')
      }
    ]
  },
  {
    category: t('pricing.comparison.categories.contentStorage'),
    features: [
      {
        name: t('pricing.comparison.features.storage'),
        starter: "100GB",
        standard: "2TB",
        advanced: "5TB",
        enterprise: t('pricing.comparison.values.custom')
      },
      {
        name: t('pricing.comparison.features.videoProcessing'),
        starter: t('pricing.comparison.values.standard'),
        standard: t('pricing.comparison.values.priority'),
        advanced: t('pricing.comparison.values.fastTrack'),
        enterprise: t('pricing.comparison.values.dedicated')
      }
    ]
  }
];

export default function Pricing() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { createCheckout, subscribed, subscription_tier, loading } = useSubscription();
  const navigate = useNavigate();
  const [planLoading, setPlanLoading] = React.useState<string | null>(null);

  const plans = getPlanData(t);
  const comparisonFeatures = getComparisonFeatures(t);

  const handlePlanAction = async (planKey: string, planName: string) => {
    setPlanLoading(planKey);
    
    try {
      if (planKey === 'starter') {
        if (user) {
          await createCheckout('starter');
        } else {
          navigate('/auth?plan=starter');
        }
      } else if (planKey === 'enterprise') {
        // Contact sales for enterprise
        window.open('mailto:sales@axessible.com?subject=Enterprise Plan Inquiry', '_blank');
      } else {
        // For other paid plans
        if (user) {
          await createCheckout(planKey);
        } else {
          navigate(`/auth?plan=${planKey}`);
        }
      }
    } catch (error) {
      console.error('Plan action failed:', error);
    } finally {
      setPlanLoading(null);
    }
  };

  const renderFeatureValue = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? <Check className="w-4 h-4 text-green-600" /> : <span className="text-muted-foreground">—</span>;
    }
    return <span className="text-sm">{value}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Header */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-light mb-4 leading-tight text-foreground">
            {t('pricing.title')}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-light mb-2 leading-relaxed">
            {t('pricing.subtitle')}
          </p>
          <p className="text-sm text-muted-foreground font-light">
            {t('pricing.disclaimer')}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {plans.map((plan) => (
            <Card 
              key={plan.key} 
              className={`relative flex flex-col ${plan.highlight ? 'ring-2 ring-primary shadow-lg scale-105' : ''} ${
                subscribed && subscription_tier === plan.name ? 'ring-2 ring-green-500' : ''
              }`}
            >
              {plan.highlight && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">
                  {t('pricing.mostPopular')}
                </Badge>
              )}
              
              {subscribed && subscription_tier === plan.name && (
                <Badge className="absolute -top-2 right-4 bg-green-600">
                  {t('pricing.currentPlan')}
                </Badge>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <span>{plan.name}</span>
                  {plan.highlight && <Star className="w-5 h-5 text-primary" />}
                </CardTitle>
                <div className="mt-4">
                  <div className="text-3xl md:text-4xl font-light text-center text-foreground">{plan.price}</div>
                  <div className="text-sm text-muted-foreground font-light text-center mt-1">{plan.cadence}</div>
                  {plan.trial && (
                    <div className="text-sm text-primary font-light text-center mt-1">{plan.trial}</div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground text-center mt-2">
                  {plan.storage}
                </div>
              </CardHeader>

              <CardContent className="flex flex-col flex-1">
                <div className="flex-1">
                  <ul className="space-y-3 mb-6 text-left">
                    {plan.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button 
                  className="w-full" 
                  variant={plan.highlight ? "default" : "outline"}
                  onClick={() => handlePlanAction(plan.key, plan.name)}
                  disabled={planLoading === plan.key || (subscribed && subscription_tier === plan.name)}
                >
                  {planLoading === plan.key
                    ? t('pricing.loading')
                    : subscribed && subscription_tier === plan.name 
                    ? t('pricing.currentPlan')
                    : plan.cta
                  }
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-card rounded-2xl border p-8 shadow-soft">
          <h3 className="text-2xl md:text-3xl font-light mb-6 text-center text-foreground">{t('pricing.featureComparison')}</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-light text-foreground">{t('common.feature')}</th>
                   <th className="text-center p-4 font-light text-foreground">{t('pricing.plans.starter.name')}</th>
                  <th className="text-center p-4 font-light text-foreground">{t('pricing.plans.standard.name')}</th>
                  <th className="text-center p-4 font-light text-foreground">{t('pricing.plans.advanced.name')}</th>
                  <th className="text-center p-4 font-light text-foreground">{t('pricing.plans.enterprise.name')}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((category) => (
                  <tbody key={category.category}>
                    <tr>
                      <td colSpan={5} className="p-4 font-light text-primary bg-muted/50">
                        {category.category}
                      </td>
                    </tr>
                    {category.features.map((feature, index) => (
                      <tr key={index} className="border-b hover:bg-muted/20">
                        <td className="p-4 text-sm font-light">{feature.name}</td>
                        <td className="p-4 text-center">{renderFeatureValue(feature.starter)}</td>
                        <td className="p-4 text-center">{renderFeatureValue(feature.standard)}</td>
                        <td className="p-4 text-center">{renderFeatureValue(feature.advanced)}</td>
                        <td className="p-4 text-center">{renderFeatureValue(feature.enterprise)}</td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 text-center max-w-2xl mx-auto">
          <h3 className="text-2xl md:text-3xl font-light mb-4 text-foreground">{t('pricing.questionsAboutPricing')}</h3>
          <p className="text-muted-foreground font-light mb-6 leading-relaxed">
            {t('pricing.teamHelpChoose')}
          </p>
          <Button 
            variant="outline"
            size="lg"
            onClick={() => window.open('mailto:sales@axessible.com?subject=Pricing Questions', '_blank')}
          >
            {t('pricing.contactUs')}
          </Button>
        </div>
      </div>
    </div>
  );
}
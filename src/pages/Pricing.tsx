import React from 'react';
import { Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

const plans = [
  {
    name: "Starter",
    price: "26 €",
    cadence: "per month",
    users: "1 user",
    storage: "100GB storage",
    features: [
      "Customizable Axessible Player",
      "Password privacy & unlisted links",
      "Review & collaboration tools",
      "Embed video links",
      "Engagement analytics",
      "CWI Captions with emotion tagging",
      "Basic Audio Descriptions"
    ],
    cta: "Start free",
    highlight: false
  },
  {
    name: "Standard",
    price: "65 €",
    cadence: "per month",
    users: "5 users",
    storage: "2TB storage",
    features: [
      "Everything in Starter",
      "Third-party player support",
      "Human in the Loop support for Audio Description up to 3 videos a month",
      "Custom Text to Transcript Integration"
    ],
    cta: "Try Standard",
    highlight: false
  },
  {
    name: "Advanced",
    price: "250 €",
    cadence: "per month",
    users: "10 users",
    storage: "7TB storage",
    features: [
      "Everything in Standard",
      "Dubbing in 15+ Languages",
      "Marketing automation integrations",
      "WCAG/ADA compliance reporting",
      "Expert-led accessibility audit for your videos",
      "Human in the Loop support for Creative Storytelling Audio Description with manual timing-synchronization for up to 10 videos a month"
    ],
    cta: "Go Advanced",
    highlight: true
  },
  {
    name: "Enterprise",
    price: "Talk to us",
    cadence: "",
    users: "Unlimited",
    storage: "Custom",
    features: [
      "SSO & governance",
      "Priority Support",
      "Custom AI budgets",
      "Security reviews",
      "Custom integrations",
      "Dedicated account manager",
      "Custom ASL avatars",
      "Custom training and support for your teams",
      "Multi-Language dubbing, including lip-sync"
    ],
    cta: "Contact sales",
    highlight: false
  }
];

const comparisonFeatures = [
  {
    category: "Accessibility Features",
    features: [
      {
        name: "Axessible Player (CWI, AD, ASL)",
        starter: true,
        standard: true,
        advanced: true,
        enterprise: true
      },
      {
        name: "Emotion-tagged Captions",
        starter: true,
        standard: true,
        advanced: true,
        enterprise: true
      },
      {
        name: "AI Audio Descriptions",
        starter: "Basic",
        standard: "Advanced",
        advanced: "Advanced",
        enterprise: "Custom"
      },
      {
        name: "ASL Avatar Support",
        starter: false,
        standard: false,
        advanced: false,
        enterprise: "Custom"
      }
    ]
  },
  {
    category: "Content & Storage",
    features: [
      {
        name: "Storage",
        starter: "100GB",
        standard: "2TB",
        advanced: "7TB",
        enterprise: "Custom"
      },
      {
        name: "Video Processing",
        starter: "Standard",
        standard: "Priority",
        advanced: "Fast Track",
        enterprise: "Dedicated"
      }
    ]
  }
];

export default function Pricing() {
  const { user } = useAuth();
  const { createCheckout, subscribed, subscription_tier, loading } = useSubscription();
  const navigate = useNavigate();

  const handlePlanAction = async (planName: string) => {
    if (planName === 'Starter') {
      if (user) {
        await createCheckout('starter');
      } else {
        navigate('/auth?plan=starter');
      }
    } else if (planName === 'Enterprise') {
      // Contact sales for enterprise
      window.open('mailto:sales@axessible.com?subject=Enterprise Plan Inquiry', '_blank');
    } else {
      // For other paid plans
      if (user) {
        await createCheckout(planName.toLowerCase());
      } else {
        navigate(`/auth?plan=${planName.toLowerCase()}`);
      }
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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Plans that make every video{' '}
            <span className="text-primary">Axessible</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-2">
            Choose the perfect plan for your accessibility needs
          </p>
          <p className="text-sm text-muted-foreground">
            Prices exclude tax. Cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative ${plan.highlight ? 'ring-2 ring-primary shadow-lg scale-105' : ''} ${
                subscribed && subscription_tier === plan.name ? 'ring-2 ring-green-500' : ''
              }`}
            >
              {plan.highlight && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">
                  Most Popular
                </Badge>
              )}
              
              {subscribed && subscription_tier === plan.name && (
                <Badge className="absolute -top-2 right-4 bg-green-600">
                  Current Plan
                </Badge>
              )}
              
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{plan.name}</span>
                  {plan.highlight && <Star className="w-5 h-5 text-primary" />}
                </CardTitle>
                <div className="mt-2">
                  <div className="text-3xl font-bold">{plan.price}</div>
                  <div className="text-sm text-muted-foreground">{plan.cadence}</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {plan.storage}
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className="w-full" 
                  variant={plan.highlight ? "default" : "outline"}
                  onClick={() => handlePlanAction(plan.name)}
                  disabled={loading || (subscribed && subscription_tier === plan.name)}
                >
                  {loading 
                    ? "Loading..." 
                    : subscribed && subscription_tier === plan.name 
                    ? "Current Plan" 
                    : plan.cta
                  }
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-2xl font-semibold mb-6">Feature comparison</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Feature</th>
                  <th className="text-center p-3 font-medium">Starter</th>
                  <th className="text-center p-3 font-medium">Standard</th>
                  <th className="text-center p-3 font-medium">Advanced</th>
                  <th className="text-center p-3 font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((category) => (
                  <tbody key={category.category}>
                    <tr>
                      <td colSpan={5} className="p-3 font-medium text-primary bg-muted/50">
                        {category.category}
                      </td>
                    </tr>
                    {category.features.map((feature, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-3 text-sm">{feature.name}</td>
                        <td className="p-3 text-center">{renderFeatureValue(feature.starter)}</td>
                        <td className="p-3 text-center">{renderFeatureValue(feature.standard)}</td>
                        <td className="p-3 text-center">{renderFeatureValue(feature.advanced)}</td>
                        <td className="p-3 text-center">{renderFeatureValue(feature.enterprise)}</td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-semibold mb-4">Questions about pricing?</h3>
          <p className="text-muted-foreground mb-6">
            Our team is here to help you choose the right plan for your needs.
          </p>
          <Button 
            variant="outline"
            onClick={() => window.open('mailto:sales@axessible.com?subject=Pricing Questions', '_blank')}
          >
            Contact Sales
          </Button>
        </div>
      </div>
    </div>
  );
}
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export const InterbrandFeatures: React.FC = () => {
  const { theme, isDemo } = useTheme();
  
  // Only show for Interbrand demo
  if (!isDemo || theme.id !== 'interbrand') {
    return null;
  }

  const features = [
    {
      number: '1',
      title: 'IMMERSION, AWARENESS & TOOLS',
      description: '',
    },
    {
      number: '2',
      title: 'EXPERIENCE AUDITS',
      description: '',
    },
    {
      number: '3',
      title: 'INSIGHT, DESIGN & INNOVATION',
      description: 'Co-creating barrier-free interactions',
    },
    {
      number: '4',
      title: 'GOVERNANCE & STRATEGY',
      description: 'Setting strategic direction',
    },
    {
      number: '5',
      title: 'BARRIER-FREE BRAND COMMUNICATIONS',
      description: 'Telling authentic stories',
    },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-light text-foreground mb-12 text-center">
            We support brands in the pursuit of Barrier-Free Brand Experience across five key areas:
          </h2>
          
          <div className="space-y-8">
            {features.map((feature) => (
              <div key={feature.number} className="border-l-4 border-primary pl-6 py-4">
                <div className="flex items-baseline gap-4">
                  <span className="text-4xl font-light text-primary">{feature.number}.</span>
                  <div>
                    <h3 className="text-xl font-medium text-foreground mb-2">
                      {feature.title}
                    </h3>
                    {feature.description && (
                      <p className="text-muted-foreground font-light">
                        {feature.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

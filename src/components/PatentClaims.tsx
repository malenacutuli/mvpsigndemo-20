import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Workflow, HandHelping, Shield, ArrowRight, CheckCircle } from 'lucide-react';

export const PatentClaims: React.FC = () => {
  const patentClaims = [
    {
      icon: <Workflow className="w-6 h-6" />,
      number: "Claim 1",
      title: "Data Processing Logic",
      description: "Automated multi-modal processing pipeline with intelligent data routing",
      validatedBy: [
        "ASR with precise word-level timestamps",
        "Sophisticated caption generation algorithms",
        "Contextual scene analysis and summarization",
        "Modular processing with error handling"
      ],
      implementation: "Complete automated workflow orchestration"
    },
    {
      icon: <HandHelping className="w-6 h-6" />,
      number: "Claim 2",
      title: "Avatar Generation with Timing Sync",
      description: "AI-animated ASL avatars with precise speech synchronization",
      validatedBy: [
        "Three distinct children-friendly ASL avatars",
        "Speech timestamp parsing and gesture mapping",
        "Timeline-matched animation rendering",
        "Real-time synchronization with spoken content"
      ],
      implementation: "Advanced ASL generation with pixel-perfect timing"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      number: "Claim 3",
      title: "Integrated Compliance Layer",
      description: "Automated accessibility compliance validation and formatting",
      validatedBy: [
        "WCAG 2.1 Level AA compliance checks",
        "EAA and ADA standards adherence",
        "Automatic visual element reformatting",
        "Content auditing and validation"
      ],
      implementation: "Built-in accessibility verification system"
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Award className="w-4 h-4 mr-2" />
            Patent Validation
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Protecting Revolutionary Innovation
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our MVP directly validates key patent claims, demonstrating unique intellectual property 
            that creates substantial competitive advantages in the accessibility market.
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
                    <Badge variant="outline" className="mb-2">{claim.number}</Badge>
                    <CardTitle className="text-lg">{claim.title}</CardTitle>
                  </div>
                </div>
                <CardDescription>{claim.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Validated By:
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
              <CardTitle className="text-2xl">Strategic Importance</CardTitle>
              <CardDescription className="text-base">
                Why these patent claims create substantial market value
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ArrowRight className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-semibold mb-2">Market Differentiation</h4>
                  <p className="text-sm text-muted-foreground">
                    Unique features that competitors cannot easily replicate
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-6 h-6 text-accent" />
                  </div>
                  <h4 className="font-semibold mb-2">IP Protection</h4>
                  <p className="text-sm text-muted-foreground">
                    Enforceable intellectual property rights for core technology
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-cwi-main-green/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Award className="w-6 h-6 text-cwi-main-green" />
                  </div>
                  <h4 className="font-semibold mb-2">Investment Value</h4>
                  <p className="text-sm text-muted-foreground">
                    Proven innovation backing future development and scaling
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
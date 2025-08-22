import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Brain, Users, Building } from 'lucide-react';

export const IndustryFirst: React.FC = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 text-sm font-medium px-4 py-2">
            INDUSTRY FIRST
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Multi-Modal Video Accessibility Engine
          </h2>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Where competitors offer point solutions, Axessible delivers end-to-end automation. 
            Our patent-pending platform transforms video accessibility from compliance burden to competitive advantage.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
            <CardContent className="p-8 text-center">
              <Zap className="w-12 h-12 text-primary mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-3">Patent-Pending AI Synchronization</h3>
              <p className="text-muted-foreground">
                Advanced neural networks ensure perfect timing between visual content and accessibility features.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
            <CardContent className="p-8 text-center">
              <Brain className="w-12 h-12 text-accent mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-3">Emotional Intelligence Captions</h3>
              <p className="text-muted-foreground">
                Context-aware captions with tone detection and visual styling for enhanced comprehension.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-cwi-main-orange mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-3">Multi-Language Sign Avatars</h3>
              <p className="text-muted-foreground">
                Professional AI-powered sign language interpreters supporting 15+ regional variants including ASL, BSL, FSL, and more.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
            <CardContent className="p-8 text-center">
              <Building className="w-12 h-12 text-primary mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-3">Enterprise Features</h3>
              <div className="text-muted-foreground text-left">
                <ul className="space-y-2 text-sm">
                  <li>• Built-in compliance auditing & reporting</li>
                  <li>• White-label embeddable player</li>
                  <li>• API-first architecture</li>
                  <li>• Enterprise SSO & user management</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <blockquote className="text-2xl md:text-3xl font-bold text-foreground italic">
            "We don't just enhance video—we future-proof it."
          </blockquote>
        </div>
      </div>
    </section>
  );
};
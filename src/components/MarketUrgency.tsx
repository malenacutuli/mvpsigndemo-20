import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertCircle, Calendar, Shield } from 'lucide-react';

export const MarketUrgency: React.FC = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 text-sm font-medium px-4 py-2">
            MARKET URGENCY
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            The $13B Accessibility Gap
          </h2>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            With 215+ million hours of video uploaded annually and accessibility regulations tightening globally, 
            the cost of non-compliance has never been higher.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="bg-card border border-border">
            <CardContent className="p-8 text-center">
              <div className="text-5xl font-bold text-destructive mb-2">89%</div>
              <h3 className="text-xl font-semibold mb-3">User Accessibility Issues</h3>
              <p className="text-muted-foreground">
                Report barriers when accessing digital content
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="p-8 text-center">
              <div className="text-5xl font-bold text-destructive mb-2">42%</div>
              <h3 className="text-xl font-semibold mb-3">Brand Abandonment</h3>
              <p className="text-muted-foreground">
                Due to inaccessible user experiences
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="p-8 text-center">
              <div className="text-2xl font-bold text-destructive mb-2">June 2025</div>
              <h3 className="text-xl font-semibold mb-3">EAA Enforcement</h3>
              <p className="text-muted-foreground">
                European Accessibility Act penalties begin
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mb-12">
          <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Turn Compliance from Cost Center to Revenue Driver
          </h3>
          <p className="text-xl text-muted-foreground max-w-5xl mx-auto leading-relaxed">
            Axessible transforms accessibility from regulatory burden to competitive advantage—enabling enterprises, 
            governments, and educators to reach 100% of their audience while ensuring full compliance across all major standards.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          <Badge variant="outline" className="text-lg px-6 py-3 bg-card">
            <Shield className="w-5 h-5 mr-2" />
            WCAG 2.1 AAA Compliant
          </Badge>
          <Badge variant="outline" className="text-lg px-6 py-3 bg-card">
            <Shield className="w-5 h-5 mr-2" />
            ADA Compatible
          </Badge>
          <Badge variant="outline" className="text-lg px-6 py-3 bg-card">
            <Shield className="w-5 h-5 mr-2" />
            EAA Ready
          </Badge>
          <Badge variant="outline" className="text-lg px-6 py-3 bg-card">
            <Shield className="w-5 h-5 mr-2" />
            Section 508 Certified
          </Badge>
        </div>
      </div>
    </section>
  );
};
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const FeatureBoxes: React.FC = () => {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          {/* Compliance Box */}
          <div className="bg-blue-50 rounded-2xl p-8 text-left">
            <h3 className="text-xl font-bold text-foreground mb-4">
              Compliance
            </h3>
            <p className="text-muted-foreground">
              WCAG 2.1 AA and UNE-EN 301549 based remediation for EAA compliance.
            </p>
          </div>
          
          {/* Custom Solutions Box */}
          <div className="bg-gray-50 rounded-2xl p-8 text-left">
            <h3 className="text-xl font-bold text-foreground mb-4">
              Customizable Solutions
            </h3>
            <p className="text-muted-foreground">
              Plans designed to adapt to all types of businesses.
            </p>
          </div>
          
          {/* Heavy Lifting Box */}
          <div className="bg-gray-50 rounded-2xl p-8 text-left">
            <h3 className="text-xl font-bold text-foreground mb-4">
              We Handle the Heavy Work
            </h3>
            <p className="text-muted-foreground">
              Fast implementation, effortlessly. We do the heavy lifting.
            </p>
          </div>
        </div>
        
        {/* Contact CTA */}
        <div className="text-center">
          <Link to="/pricing">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg font-semibold rounded-full inline-flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Contact us
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
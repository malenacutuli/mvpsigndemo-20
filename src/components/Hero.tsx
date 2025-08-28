import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Hero: React.FC = () => {
  return (
    <section className="relative bg-white py-20 lg:py-32 overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto text-center">
          {/* Subtitle */}
          <p className="text-sm md:text-base text-muted-foreground uppercase tracking-wider mb-6 font-medium">
            VIDEO ACCESSIBILITY PLATFORM DESIGNED FOR YOUR BUSINESS
          </p>
          
          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-foreground leading-none mb-8">
            Build something better.
            <span className="block">For everyone.</span>
          </h1>
          
          {/* Description */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-12">
            Create inclusive experiences that meet WCAG and EAA standards, thanks to the leading platform in digital accessibility and the support of expert services.
          </p>
          
          {/* CTA Button */}
          <Link to="/upload">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg font-semibold rounded-full inline-flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Start Your Upload
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          
          {/* Inclusivity Message */}
          <div className="mt-16 max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Inclusivity comes standard
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Everything from customizable captions to high-contrast colors are baked into every video you host with Axessible, so accessibility isn't something you have to think about. It's just the way your videos are.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
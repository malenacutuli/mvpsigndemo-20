import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HandHelping, Subtitles, Mic, Sparkles, Users, Award } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section className="relative min-h-screen bg-gradient-accessibility flex flex-col overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      {/* Header */}
      <header className="relative z-20 flex justify-between items-center p-6">
        <img
          src="/lovable-uploads/69bee058-9d55-465d-bec0-0156468ba560.png"
          alt="Axessible logo – multi-modal accessible video platform"
          className="h-6 md:h-7 w-auto opacity-90"
          loading="lazy"
          decoding="async"
        />
        <Badge variant="secondary" className="text-sm font-medium px-4 py-2">
          <Award className="w-4 h-4 mr-2" />
          Patent-Pending AI Technology
        </Badge>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex items-center">
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Main Headline */}
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 leading-tight">
              The World's First End-to-End AI Platform for
              <span className="gradient-primary bg-clip-text text-transparent block">
                Fully Accessible Video
              </span>
            </h1>
            
            {/* Secondary Headline */}
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-6">
              Create Born-Accessible Video in Seconds.
            </h2>

            {/* Key Features */}
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-accent/10 rounded-full blur-xl animate-pulse delay-1000"></div>
    </section>
  );
};
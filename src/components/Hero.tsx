import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HandHelping, Subtitles, Mic, Sparkles, Users, Award } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section className="relative min-h-screen bg-gradient-accessibility flex items-center overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Brand Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/lovable-uploads/5c62e582-44b7-4676-a8f0-7487960bc7a9.png"
            alt="Axessible logo – multi-modal accessible video platform"
            className="h-12 md:h-14 w-auto"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="max-w-4xl mx-auto text-center">
          {/* Patent Badge */}
          <Badge variant="secondary" className="mb-6 text-sm font-medium px-4 py-2">
            <Award className="w-4 h-4 mr-2" />
            Patent-Pending AI Technology
          </Badge>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
            Revolutionary
            <span className="gradient-primary bg-clip-text text-transparent block">
              Video Accessibility
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            AI-powered platform transforming video content with 
            <strong className="text-primary"> Captions with Intention</strong>, 
            <strong className="text-accent"> AI-animated ASL avatars</strong>, and 
            <strong className="text-cwi-main-orange"> celebrity-style audio descriptions</strong>.
          </p>

          {/* Key Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto">
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <Subtitles className="w-8 h-8 text-primary mb-3 mx-auto" />
              <h3 className="font-semibold text-lg mb-2">Captions with Intention</h3>
              <p className="text-muted-foreground text-sm">
                Dynamic captions that sync with emotion, timing, and speaker identity
              </p>
            </div>
            
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <HandHelping className="w-8 h-8 text-accent mb-3 mx-auto" />
              <h3 className="font-semibold text-lg mb-2">AI ASL Avatars</h3>
              <p className="text-muted-foreground text-sm">
                Children-friendly animated avatars with precise sign language synchronization
              </p>
            </div>
            
            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
              <Mic className="w-8 h-8 text-cwi-main-orange mb-3 mx-auto" />
              <h3 className="font-semibold text-lg mb-2">Celebrity-Style Audio</h3>
              <p className="text-muted-foreground text-sm">
                Distinctive voice descriptions tailored for educational and recipe content
              </p>
            </div>
          </div>

          {/* Content Verticals */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Badge variant="outline" className="text-base px-4 py-2">
              <Users className="w-4 h-4 mr-2" />
              Children's Educational Content
            </Badge>
            <Badge variant="outline" className="text-base px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              Recipe Video Content
            </Badge>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 gradient-primary hover:scale-105 transition-transform"
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Experience the Demo
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-6 hover:bg-primary/10"
            >
              Learn More
            </Button>
          </div>

          {/* Technical Note */}
          <p className="text-sm text-muted-foreground mt-8 max-w-2xl mx-auto">
            Demonstrating core patent claims including automated multi-modal processing, 
            precise avatar timing synchronization, and integrated compliance validation.
          </p>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-accent/10 rounded-full blur-xl animate-pulse delay-1000"></div>
    </section>
  );
};
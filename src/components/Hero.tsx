import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HandHelping, Subtitles, Mic, Sparkles, Users, Award } from 'lucide-react';
import { UploadAccessible } from '@/components/UploadAccessible';

export const Hero: React.FC = () => {
  return (
    <section className="relative min-h-screen bg-gradient-accessibility flex flex-col overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      {/* Header */}
      <header className="relative z-20 flex justify-end items-center p-6">
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
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 max-w-6xl mx-auto">
              <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
                <Subtitles className="w-8 h-8 text-primary mb-3 mx-auto" />
                <h3 className="font-semibold text-lg mb-2">Captions with Intention</h3>
                <p className="text-muted-foreground text-sm">
                  AI-powered emotional styling makes captions expressive and contextual
                </p>
              </div>
              
              <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
                <Mic className="w-8 h-8 text-accent mb-3 mx-auto" />
                <h3 className="font-semibold text-lg mb-2">Audio Descriptions</h3>
                <p className="text-muted-foreground text-sm">
                  Automatic visual content descriptions for blind and low-vision users
                </p>
              </div>
              
              <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
                <HandHelping className="w-8 h-8 text-cwi-main-orange mb-3 mx-auto" />
                <h3 className="font-semibold text-lg mb-2">Multi-Language Sign Avatars</h3>
                <p className="text-muted-foreground text-sm">
                  Professional AI interpreters in 15+ sign language variants with cultural authenticity
                </p>
              </div>
              
              <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
                <Users className="w-8 h-8 text-primary mb-3 mx-auto" />
                <h3 className="font-semibold text-lg mb-2">Legal Compliance</h3>
                <p className="text-muted-foreground text-sm">
                  Automated WCAG, ADA, and EAA compliance checking and reporting
                </p>
              </div>
            </div>

            {/* Architecture Note */}
            <p className="text-lg text-muted-foreground mb-6 max-w-4xl mx-auto leading-relaxed">
              Axessible is built on a patent-backed architecture that integrates accessibility into the core of content creation—not as an afterthought.
            </p>

            {/* Final CTA */}
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
              Make Video Truly Inclusive.
            </h3>
          </div>
        </div>
      </div>

      {/* Video Upload & Experience */}
      <div className="container mx-auto px-6 py-16">
        <UploadAccessible />
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-accent/10 rounded-full blur-xl animate-pulse delay-1000"></div>
    </section>
  );
};
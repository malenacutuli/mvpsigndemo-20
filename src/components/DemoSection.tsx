import React, { useState } from 'react';
import { AxessiblePlayer } from './AxessiblePlayer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChefHat, GraduationCap, Play, Sparkles } from 'lucide-react';

export const DemoSection: React.FC = () => {
  const [selectedDemo, setSelectedDemo] = useState<'recipe' | 'education'>('recipe');

  const demoContent = {
    recipe: {
      title: "Perfect Pasta Masterclass",
      description: "Experience Gordon Ramsay-style audio descriptions with dynamic CWI captions",
      videoSrc: "/api/placeholder/800/450", // Placeholder for demo video
      features: [
        "Gordon Ramsay-inspired audio descriptions",
        "Chef character color attribution (Orange)",
        "Dynamic volume and pitch visualization",
        "Professional cooking terminology"
      ]
    },
    education: {
      title: "Fun Learning Adventures",
      description: "Warm, engaging voice descriptions perfect for children's educational content",
      videoSrc: "/api/placeholder/800/450", // Placeholder for demo video
      features: [
        "Selena Gomez-inspired warm voice style",
        "Child-friendly ASL avatars",
        "Educational vocabulary emphasis",
        "Safe, engaging learning environment"
      ]
    }
  };

  const currentDemo = demoContent[selectedDemo];

  return (
    <section id="demo" className="py-20 bg-background">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="w-4 h-4 mr-2" />
            Interactive Demo
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Experience Axessible in Action
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            See how our AI-powered accessibility features transform video content 
            for different audiences and content types.
          </p>
        </div>

        {/* Demo Type Selector */}
        <div className="flex justify-center mb-8">
          <div className="bg-card rounded-lg p-2 border">
            <Button
              variant={selectedDemo === 'recipe' ? 'default' : 'ghost'}
              onClick={() => setSelectedDemo('recipe')}
              className="flex items-center gap-2"
            >
              <ChefHat className="w-4 h-4" />
              Recipe Content
            </Button>
            <Button
              variant={selectedDemo === 'education' ? 'default' : 'ghost'}
              onClick={() => setSelectedDemo('education')}
              className="flex items-center gap-2 ml-2"
            >
              <GraduationCap className="w-4 h-4" />
              Educational Content
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {selectedDemo === 'recipe' ? <ChefHat className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
                  {currentDemo.title}
                </CardTitle>
                <CardDescription>
                  {currentDemo.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Demo Player with Simulated Video */}
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <AxessiblePlayer
                    videoSrc="data:video/mp4;base64,AAAAIGZ0eXBtcDQyAAACAGlzb21pc28yYXZjMW1wNDE="
                    title={currentDemo.title}
                    className="w-full h-full"
                  />
                  
                  {/* Demo Overlay for No Video */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Play className="w-16 h-16 mx-auto mb-4 opacity-60" />
                      <h3 className="text-xl font-semibold mb-2">Demo Player</h3>
                      <p className="text-sm opacity-80">
                        Interactive accessibility controls available
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Features</CardTitle>
                <CardDescription>
                  Unique capabilities demonstrated in this {selectedDemo} example
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {currentDemo.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CWI Character Colors</CardTitle>
                <CardDescription>
                  Dynamic color attribution for speaker identification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedDemo === 'recipe' ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-cwi-main-orange rounded"></div>
                        <span className="text-sm">Chef (Main Character)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-cwi-main-blue rounded"></div>
                        <span className="text-sm">Narrator</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-cwi-main-yellow rounded"></div>
                        <span className="text-sm">Child Character</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-cwi-main-green rounded"></div>
                        <span className="text-sm">Teacher</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-cwi-main-purple rounded"></div>
                        <span className="text-sm">Narrator</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accessibility Controls</CardTitle>
                <CardDescription>
                  Try the toggle buttons in the player
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p><strong>CC:</strong> Captions with Intention</p>
                  <p><strong>👋:</strong> AI-Animated ASL Avatar</p>
                  <p><strong>🎤:</strong> Celebrity-Style Audio Description</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
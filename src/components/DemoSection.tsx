import React, { useState } from 'react';
import { AxessiblePlayer } from './AxessiblePlayer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChefHat, GraduationCap, Play, Sparkles, Volume2, HandHelping } from 'lucide-react';

export const DemoSection: React.FC = () => {
  const [selectedDemo, setSelectedDemo] = useState<'recipe' | 'education'>('recipe');
  const [selectedVoice, setSelectedVoice] = useState('gordon-ramsay');
  const [selectedASLAvatar, setSelectedASLAvatar] = useState('chef-avatar');

  const demoContent = {
    recipe: {
      title: "Pasta Cooking Fundamentals",
      description: "Clear voice instruction on pasta preparation techniques—perfect for accessibility demonstration",
      videoSrc: "/videos/pasta-recipe.mp4",
      duration: "1:20",
      features: [
        "Clear voice narration without background music",
        "Detailed pasta cooking technique breakdowns", 
        "Professional chef character (Orange CWI attribution)",
        "Perfect for audio description layering",
        "Culinary terminology with emphasis markers",
        "Adult-focused professional ASL chef avatar"
      ],
      voiceOptions: [
        { id: 'gordon-ramsay', name: 'Gordon Ramsay Style', description: 'Passionate, authoritative cooking voice' },
        { id: 'julia-child', name: 'Julia Child Style', description: 'Warm, encouraging culinary guide' },
        { id: 'anthony-bourdain', name: 'Anthony Bourdain Style', description: 'Sophisticated, worldly food narrator' }
      ],
      aslOptions: [
        { id: 'chef-avatar', name: 'Professional Chef', description: 'Adult professional with culinary signs' },
        { id: 'food-expert', name: 'Food Expert', description: 'Specialized in cooking terminology' }
      ]
    },
    education: {
      title: "Superhero Science Adventures",
      description: "Warm, engaging voice descriptions with child-friendly ASL avatars for educational content",
      videoSrc: "https://spaceplace.nasa.gov/review/black-holes/what-is-a-black-hole_1920x1080.mp4",
      duration: "2:45",
      features: [
        "Selena Gomez-inspired warm narration",
        "Child character attribution (Yellow/Green)",
        "Educational vocabulary highlighting",
        "Safe, encouraging learning environment",
        "Superhero ASL avatar options"
      ],
      voiceOptions: [
        { id: 'selena-gomez', name: 'Selena Gomez Style', description: 'Warm, encouraging educational voice' },
        { id: 'emma-stone', name: 'Emma Stone Style', description: 'Friendly, approachable learning guide' },
        { id: 'zendaya', name: 'Zendaya Style', description: 'Young, relatable educational narrator' }
      ],
      aslOptions: [
        { id: 'superhero-captain', name: 'Captain Wonder', description: 'Superhero character for science lessons' },
        { id: 'superhero-star', name: 'Star Guardian', description: 'Magical hero for creative learning' },
        { id: 'friendly-teacher', name: 'Teacher Maya', description: 'Professional educator avatar' }
      ]
    }
  };

  const currentDemo = demoContent[selectedDemo];
  const currentVoice = currentDemo.voiceOptions.find(v => v.id === selectedVoice) || currentDemo.voiceOptions[0];
  const currentASL = currentDemo.aslOptions.find(a => a.id === selectedASLAvatar) || currentDemo.aslOptions[0];

  return (
    <section id="demo" className="py-20 bg-background">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="w-4 h-4 mr-2" />
            Live Interactive Demo
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Experience Axessible in Action
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Fully functional demonstrations of our AI-powered accessibility features 
            with real celebrity-style voices and animated ASL avatars.
          </p>
        </div>

        {/* Demo Type Selector */}
        <div className="flex justify-center mb-8">
          <div className="bg-card rounded-lg p-2 border">
            <Button
              variant={selectedDemo === 'recipe' ? 'default' : 'ghost'}
              onClick={() => {
                setSelectedDemo('recipe');
                setSelectedVoice('gordon-ramsay');
                setSelectedASLAvatar('chef-avatar');
              }}
              className="flex items-center gap-2"
            >
              <ChefHat className="w-4 h-4" />
              Recipe Content
            </Button>
            <Button
              variant={selectedDemo === 'education' ? 'default' : 'ghost'}
              onClick={() => {
                setSelectedDemo('education');
                setSelectedVoice('selena-gomez');
                setSelectedASLAvatar('superhero-captain');
              }}
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedDemo === 'recipe' ? <ChefHat className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
                      {currentDemo.title}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {currentDemo.description}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{currentDemo.duration}</Badge>
                </div>
                
                {/* Voice and ASL Selection */}
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      <Volume2 className="w-4 h-4 inline mr-1" />
                      Audio Description Voice
                    </label>
                    <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currentDemo.voiceOptions.map((voice) => (
                          <SelectItem key={voice.id} value={voice.id}>
                            <div>
                              <div className="font-medium">{voice.name}</div>
                              <div className="text-xs text-muted-foreground">{voice.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      <HandHelping className="w-4 h-4 inline mr-1" />
                      ASL Avatar Character
                    </label>
                    <Select value={selectedASLAvatar} onValueChange={setSelectedASLAvatar}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currentDemo.aslOptions.map((asl) => (
                          <SelectItem key={asl.id} value={asl.id}>
                            <div>
                              <div className="font-medium">{asl.name}</div>
                              <div className="text-xs text-muted-foreground">{asl.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <AxessiblePlayer
                  videoSrc={currentDemo.videoSrc}
                  title={currentDemo.title}
                  className="w-full h-full"
                  selectedVoice={currentVoice}
                  selectedASLAvatar={currentASL}
                  contentType={selectedDemo}
                />
              </CardContent>
            </Card>
          </div>

          {/* Features Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Features</CardTitle>
                <CardDescription>
                  Live accessibility features in this demonstration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {currentDemo.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0 animate-pulse"></div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Voice Profile</CardTitle>
                <CardDescription>
                  {currentVoice.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">{currentVoice.description}</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Tone</span>
                    <span className="font-medium">
                      {selectedDemo === 'recipe' ? 'Passionate & Authoritative' : 'Warm & Encouraging'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Pace</span>
                    <span className="font-medium">
                      {selectedDemo === 'recipe' ? 'Dynamic' : 'Clear & Steady'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Audience</span>
                    <span className="font-medium">
                      {selectedDemo === 'recipe' ? 'Adult Learners' : 'Children 6-12'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CWI Character Colors</CardTitle>
                <CardDescription>
                  Dynamic speaker identification system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedDemo === 'recipe' ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-cwi-main-orange rounded"></div>
                        <span className="text-sm">Chef Gordon (Main)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-cwi-main-blue rounded"></div>
                        <span className="text-sm">Narrator</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-cwi-support-cyan rounded"></div>
                        <span className="text-sm">Assistant Chef</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-cwi-main-yellow rounded"></div>
                        <span className="text-sm">Child Hero (Main)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-cwi-main-green rounded"></div>
                        <span className="text-sm">Teacher/Mentor</span>
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
                <CardTitle>ASL Avatar: {currentASL.name}</CardTitle>
                <CardDescription>
                  AI-animated sign language interpretation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">{currentASL.description}</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Animation Style</span>
                    <span className="font-medium">
                      {selectedDemo === 'recipe' ? 'Professional' : 'Superhero'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sign Complexity</span>
                    <span className="font-medium">
                      {selectedDemo === 'recipe' ? 'Advanced Culinary' : 'Child-Friendly'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sync Precision</span>
                    <span className="font-medium text-primary">99.2%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Try the Controls</CardTitle>
                <CardDescription>
                  Interactive accessibility toggles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p><strong>CC:</strong> Captions with Intention</p>
                  <p><strong>👋:</strong> AI-Animated ASL Avatar</p>
                  <p><strong>🎤:</strong> Celebrity-Style Audio Description</p>
                  <p className="text-xs text-muted-foreground mt-3">
                    All features work together seamlessly for complete accessibility coverage.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};
import React, { useState } from 'react';
import { AxessiblePlayer } from './AxessiblePlayer';
import { StepByStepRecipe } from './StepByStepRecipe';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChefHat, GraduationCap, Play, Sparkles, Volume2, HandHelping, Subtitles } from 'lucide-react';
import { ASLAvatarSelector } from './ASLAvatarSelector';

export const DemoSection: React.FC = () => {
  const [selectedDemo, setSelectedDemo] = useState<'recipe' | 'education'>('recipe');
  const [selectedVoice, setSelectedVoice] = useState('gordon-ramsay');
  const [selectedASLAvatar, setSelectedASLAvatar] = useState('chef-avatar');

  const demoContent = {
    recipe: {
      title: "Complete Pasta Recipe Step-by-Step Tutorial",
      description: "Full 45+ second step-by-step cooking demonstration with programmatically added accessibility features",
      videoSrc: "/videos/aglio-olio-longer.mp4",
      duration: "0:45",
      features: [
        "Complete 7-step pasta tutorial with detailed cooking instructions",
        "45+ seconds of comprehensive step-by-step cooking process", 
        "Programmatically generated Captions with Intention (CWI) for each cooking stage",
        "Professional audio descriptions for visual cooking techniques",
        "Dynamic color coding for ingredient preparation, cooking, and plating phases",
        "Synchronized ASL interpretation for culinary terminology and techniques"
      ],
      voiceOptions: [
        { id: 'gordon-ramsay', name: 'Gordon Ramsay Style', description: 'Passionate, authoritative cooking voice' },
        { id: 'julia-child', name: 'Julia Child Style', description: 'Warm, encouraging culinary guide' },
        { id: 'anthony-bourdain', name: 'Anthony Bourdain Style', description: 'Sophisticated, worldly food narrator' }
      ],
      aslOptions: [
        { 
          id: 'chef-avatar', 
          name: 'Master Chef Rosa', 
          description: 'Professional chef with culinary sign expertise'
        },
        { 
          id: 'food-expert', 
          name: 'Chef Marcus (Youth)', 
          description: 'Young professional chef, great for millennial audience'
        },
        { 
          id: 'home-cook', 
          name: 'Nonna Isabella', 
          description: 'Traditional home cook with warm, family-style signing'
        }
      ]
    },
    education: {
      title: "Superhero Science Adventures",
      description: "Warm, engaging voice descriptions with child-friendly ASL avatars for educational content",
      videoSrc: "https://spaceplace.nasa.gov/review/black-holes/what-is-a-black-hole_1920x1080.mp4",
      duration: "2:45",
      features: [
        "Dora la Exploradora-inspired warm narration",
        "Child character attribution (Yellow/Green)",
        "Educational vocabulary highlighting",
        "Spanish Spain accent optimization",
        "Playful, animated delivery"
      ],
      voiceOptions: [
        { id: 'dora-exploradora', name: 'Dora la Exploradora Style', description: 'Warm, encouraging educational voice' },
        { id: 'minnie-mouse', name: 'Minnie Mouse Style', description: 'Friendly, sweet learning guide' },
        { id: 'bob-esponja', name: 'Bob Esponja Style', description: 'Young, animated educational narrator' }
      ],
      aslOptions: [
        { 
          id: 'superhero-captain', 
          name: 'Captain Science (Kid)', 
          description: 'Young superhero perfect for children ages 6-12'
        },
        { 
          id: 'superhero-star', 
          name: 'Star Guardian Emma (Teen)', 
          description: 'Teen hero ideal for middle school students'
        },
        { 
          id: 'friendly-teacher', 
          name: 'Teacher Maya', 
          description: 'Professional educator with clear, patient signing'
        },
        { 
          id: 'student-peer', 
          name: 'Student Alex (Age 8)', 
          description: 'Child signer for peer-to-peer learning experience'
        }
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
            Explore our AI-powered accessibility features
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
                setSelectedVoice('dora-exploradora');
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
                      Audio Descriptions
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
                  
                  
                  <ASLAvatarSelector
                    options={currentDemo.aslOptions}
                    selectedValue={selectedASLAvatar}
                    onValueChange={setSelectedASLAvatar}
                    contentType={selectedDemo}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {selectedDemo === 'recipe' ? (
                  <div className="aspect-video">
                    <StepByStepRecipe />
                  </div>
                ) : (
                  <AxessiblePlayer
                    videoSrc={currentDemo.videoSrc}
                    title={currentDemo.title}
                    className="w-full h-full"
                    selectedVoice={currentVoice}
                    selectedASLAvatar={currentASL}
                    contentType={selectedDemo}
                  />
                )}
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
                <CardTitle>Try the Controls</CardTitle>
                <CardDescription>
                  Interactive accessibility features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2"><Subtitles className="w-4 h-4 text-primary" /><strong>CC:</strong> Captions with Intention</p>
                  <p className="flex items-center gap-2"><HandHelping className="w-4 h-4 text-primary" /><strong>ASL:</strong> AI-Animated ASL Avatar</p>
                  <p className="flex items-center gap-2"><Volume2 className="w-4 h-4 text-primary" /><strong>Audio:</strong> Audio Descriptions</p>
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
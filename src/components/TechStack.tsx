import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, Cpu, Mic, Eye, Brain, Shield, Zap, Code } from 'lucide-react';

export const TechStack: React.FC = () => {
  const techCategories = [
    {
      icon: <Cloud className="w-6 h-6" />,
      title: "Cloud Infrastructure",
      description: "Scalable, enterprise-grade cloud services",
      technologies: []
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: "AI & Machine Learning",
      description: "Advanced AI models for accessibility",
      technologies: ["Vision-Language Models", "Custom ASL Models", "LLM Integration"]
    },
    {
      icon: <Mic className="w-6 h-6" />,
      title: "Voice & Audio",
      description: "Adaptive voice synthesis",
      technologies: ["Custom Voice Models", "Audio Analysis"]
    },
    {
      icon: <Eye className="w-6 h-6" />,
      title: "Computer Vision",
      description: "Scene analysis and visual understanding",
      technologies: ["Blender Integration", "3D Animation", "Pose Estimation"]
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Compliance & Security",
      description: "Accessibility standards adherence",
      technologies: ["WCAG 2.1 AA", "EAA Compliance", "ADA Standards", "Security Protocols"]
    }
  ];

  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Zap className="w-4 h-4 mr-2" />
            Technology Stack
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Cutting-Edge AI Infrastructure
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Built on enterprise-grade cloud services and advanced AI models 
            to deliver unparalleled video accessibility at scale.
          </p>
        </div>

        {/* Technology Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {techCategories.map((category, index) => (
            <Card key={index} className="bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {category.icon}
                  </div>
                  <CardTitle className="text-lg">{category.title}</CardTitle>
                </div>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {category.technologies.length > 0 ? (
                    category.technologies.map((tech, techIndex) => (
                      <Badge 
                        key={techIndex} 
                        variant="outline" 
                        className="text-xs font-medium"
                      >
                        {tech}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      {category.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Architecture Highlights */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-8">Architecture Highlights</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Cpu className="w-8 h-8 text-primary" />
              </div>
              <h4 className="font-semibold mb-2">GPU-Accelerated Processing</h4>
              <p className="text-sm text-muted-foreground">
                High-performance compute for real-time AI inference and complex ASL generation
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-accent" />
              </div>
              <h4 className="font-semibold mb-2">Event-Driven Architecture</h4>
              <p className="text-sm text-muted-foreground">
                Serverless workflows with robust error handling and automatic retry mechanisms
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-cwi-main-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-cwi-main-green" />
              </div>
              <h4 className="font-semibold mb-2">Compliance-First Design</h4>
              <p className="text-sm text-muted-foreground">
                Built-in accessibility validation and automatic compliance formatting
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
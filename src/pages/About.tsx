import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import aiNeuralNetwork from '@/assets/ai-neural-network.jpg';
import humanAiCollaboration from '@/assets/human-ai-collaboration.jpg';
import emotionalAnalytics from '@/assets/emotional-analytics.jpg';

export const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Visual Background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/10"></div>
        <div className="relative container mx-auto px-4 pt-32 pb-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              The Human-Centric AI Lab
            </div>
            <h1 className="text-6xl md:text-8xl font-bold mb-8 text-foreground leading-tight animate-fade-in">
              About{' '}
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Axessible Labs
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed animate-fade-in">
              Building the next generation of AI that understands and enhances human creativity through our Emotional Audiovisual Language Model.
            </p>
          </div>
        </div>
        
        {/* Floating visual elements */}
        <div className="absolute top-1/2 left-10 w-4 h-4 bg-primary/30 rounded-full animate-pulse"></div>
        <div className="absolute top-1/3 right-20 w-6 h-6 bg-accent/40 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-1/4 left-1/3 w-3 h-3 bg-secondary/50 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Mission Card */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card/90 to-secondary/10 border border-border/20 hover:scale-[1.02] transition-all duration-500 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5"></div>
            <div className="relative p-12 md:p-16">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">Our Mission</h2>
                  <div className="w-20 h-1 bg-gradient-to-r from-primary to-accent mb-8 rounded-full"></div>
                  <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                    We're developing an Emotional Audiovisual Language Model (AVLM), trained on ethically-sourced creative content. By teaching AI to understand emotion, narrative, and intention in audiovisual media, we unlock unprecedented tools for creators, brands, and platforms.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <div className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      Ethical AI
                    </div>
                    <div className="px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium">
                      Creative Intelligence
                    </div>
                    <div className="px-4 py-2 rounded-full bg-secondary/20 text-secondary-foreground text-sm font-medium">
                      Human-Centric
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <img 
                    src={aiNeuralNetwork} 
                    alt="AI Neural Network Visualization" 
                    className="rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vision Section with Split Layout */}
      <div className="bg-gradient-to-b from-secondary/5 to-background py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">Our Vision</h2>
              <div className="w-20 h-1 bg-gradient-to-r from-primary to-accent mx-auto mb-8 rounded-full"></div>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                AI systems as creative partners, not just automation tools
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="relative">
                <img 
                  src={humanAiCollaboration} 
                  alt="Human AI Collaboration" 
                  className="rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300"
                />
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-xl"></div>
              </div>
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/20 hover:scale-105 transition-transform duration-300">
                  <h3 className="text-xl font-semibold mb-3 text-foreground">Beyond Simple Labels</h3>
                  <p className="text-muted-foreground">
                    Moving past basic happy/sad recognition to understand the rich emotional tapestry that makes content resonate.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/20 hover:scale-105 transition-transform duration-300">
                  <h3 className="text-xl font-semibold mb-3 text-foreground">Explaining the Why</h3>
                  <p className="text-muted-foreground">
                    Our AI doesn't just identify patterns—it explains why content works, empowering better creative decisions.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/20 hover:scale-105 transition-transform duration-300">
                  <h3 className="text-xl font-semibold mb-3 text-foreground">Creative Partnership</h3>
                  <p className="text-muted-foreground">
                    Enabling creators to make more impactful work and forge deeper audience connections.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Quality Section */}
      <div className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
                The Power of High-Quality Data
              </h2>
              <div className="w-20 h-1 bg-gradient-to-r from-primary to-accent mx-auto mb-8 rounded-full"></div>
              <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                AI model quality is directly linked to training data quality. While others use scraped internet data, 
                we're building on ethically-sourced, creator-contributed content rich with intentionality.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Ethical Data Card */}
              <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/20 p-8 hover:scale-105 transition-all duration-500 border border-emerald-200/50 dark:border-emerald-800/50">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="relative">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6">
                    <div className="w-6 h-6 bg-emerald-500 rounded-lg"></div>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-foreground">Ethical Data</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Rights-first, voluntarily contributed dataset from creators using our platform. 
                    Clean, consented, and imbued with creative professional intentionality.
                  </p>
                </div>
              </div>

              {/* Intentionality Card */}
              <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/20 dark:to-violet-900/20 p-8 hover:scale-105 transition-all duration-500 border border-violet-200/50 dark:border-violet-800/50">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="relative">
                  <div className="w-12 h-12 bg-violet-500/20 rounded-2xl flex items-center justify-center mb-6">
                    <div className="w-6 h-6 bg-violet-500 rounded-lg"></div>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-foreground">Creative Intent</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Data rich with creative purpose from filmmakers, advertisers, and artists. 
                    Understanding not just what people watch, but why creators made it.
                  </p>
                </div>
              </div>

              {/* Trust Moat Card */}
              <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 p-8 hover:scale-105 transition-all duration-500 border border-amber-200/50 dark:border-amber-800/50">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="relative">
                  <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-6">
                    <div className="w-6 h-6 bg-amber-500 rounded-lg"></div>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-foreground">Trust-Built Moat</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Defensible advantage through community collaboration. 
                    A repository of human creativity annotated by creators themselves.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases - Visual Grid */}
      <div className="bg-gradient-to-b from-secondary/5 to-background py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
                Transforming Industries
              </h2>
              <div className="w-20 h-1 bg-gradient-to-r from-primary to-accent mx-auto mb-8 rounded-full"></div>
            </div>

            {/* Feature Showcase */}
            <div className="relative mb-16">
              <img 
                src={emotionalAnalytics} 
                alt="Emotional Analytics Dashboard" 
                className="w-full rounded-3xl shadow-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent rounded-3xl"></div>
              <div className="absolute bottom-8 left-8 right-8">
                <h3 className="text-3xl font-bold text-white mb-2">Creative Analytics Platform</h3>
                <p className="text-white/80 text-lg">Real-time emotional resonance testing and narrative optimization</p>
              </div>
            </div>

            {/* Use Case Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200/50 dark:border-blue-800/50 hover:scale-105 transition-transform duration-300">
                <h4 className="font-semibold text-foreground mb-3">Advertising & Marketing</h4>
                <p className="text-sm text-muted-foreground">Emotional resonance testing and cross-cultural insights</p>
              </div>
              
              <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200/50 dark:border-purple-800/50 hover:scale-105 transition-transform duration-300">
                <h4 className="font-semibold text-foreground mb-3">Film & TV Studios</h4>
                <p className="text-sm text-muted-foreground">Script analysis and character development insights</p>
              </div>
              
              <div className="p-6 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200/50 dark:border-green-800/50 hover:scale-105 transition-transform duration-300">
                <h4 className="font-semibold text-foreground mb-3">Generative Tools</h4>
                <p className="text-sm text-muted-foreground">Emotionally-aware video and dynamic sound design</p>
              </div>
              
              <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border border-orange-200/50 dark:border-orange-800/50 hover:scale-105 transition-transform duration-300">
                <h4 className="font-semibold text-foreground mb-3">Media Platforms</h4>
                <p className="text-sm text-muted-foreground">Emotion-based content curation and recommendations</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* IP Strategy */}
      <div className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
                Intellectual Property Portfolio
              </h2>
              <div className="w-20 h-1 bg-gradient-to-r from-primary to-accent mx-auto mb-8 rounded-full"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-8 rounded-2xl bg-gradient-to-b from-card to-card/50 border border-border/20 hover:shadow-lg transition-shadow duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                  <div className="w-8 h-8 bg-primary/50 rounded-lg"></div>
                </div>
                <h3 className="text-xl font-bold mb-4 text-foreground">Emotion-Narrative Fusion</h3>
                <p className="text-muted-foreground">
                  Novel methods fusing emotional data with narrative structures beyond simple recognition.
                </p>
              </div>
              
              <div className="text-center p-8 rounded-2xl bg-gradient-to-b from-card to-card/50 border border-border/20 hover:shadow-lg transition-shadow duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                  <div className="w-8 h-8 bg-secondary/50 rounded-lg"></div>
                </div>
                <h3 className="text-xl font-bold mb-4 text-foreground">Explainable AI</h3>
                <p className="text-muted-foreground">
                  Transparent analysis with real-time saliency maps and narrative critiques.
                </p>
              </div>
              
              <div className="text-center p-8 rounded-2xl bg-gradient-to-b from-card to-card/50 border border-border/20 hover:shadow-lg transition-shadow duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-accent/20 to-secondary/20 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                  <div className="w-8 h-8 bg-accent/50 rounded-lg"></div>
                </div>
                <h3 className="text-xl font-bold mb-4 text-foreground">Interactive Critique</h3>
                <p className="text-muted-foreground">
                  Two-way creator-AI conversation systems for collaborative iterative feedback.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10"></div>
        <div className="relative container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl md:text-6xl font-bold mb-8 text-foreground leading-tight">
              Ready to Shape the Future of{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Creative AI?
              </span>
            </h2>
            <p className="text-xl text-muted-foreground mb-12 leading-relaxed max-w-2xl mx-auto">
              Join us in revolutionizing how artificial intelligence understands and enhances human creativity.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link to="/explore">
                <Button size="lg" className="px-10 py-6 text-lg font-medium rounded-full hover:scale-105 transition-transform duration-200 shadow-lg hover:shadow-xl">
                  Explore Our Technology
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" size="lg" className="px-10 py-6 text-lg font-medium rounded-full hover:scale-105 transition-transform duration-200 shadow-lg hover:shadow-xl">
                  Contact Our Team
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-1/4 w-2 h-2 bg-primary/30 rounded-full animate-pulse"></div>
        <div className="absolute bottom-20 right-1/3 w-3 h-3 bg-accent/40 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 right-20 w-4 h-4 bg-secondary/30 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>
    </div>
  );
};
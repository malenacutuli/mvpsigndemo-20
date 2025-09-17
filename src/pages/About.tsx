import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import aiNeuralNetwork from '@/assets/ai-neural-network.jpg';
import humanAiCollaboration from '@/assets/human-ai-collaboration.jpg';

export const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Mission Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-light text-foreground mb-8">Our Mission</h2>
              <p className="text-lg text-foreground font-light leading-relaxed mb-8">
                We're developing an Emotional Audiovisual Language Model (AVLM), trained on ethically-sourced creative content. By teaching AI to understand emotion, narrative, and intention in audiovisual media, we unlock unprecedented tools for creators, brands, and platforms.
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 border border-slate-200 text-foreground text-sm font-light rounded-full">
                  Ethical AI
                </div>
                <div className="px-4 py-2 border border-slate-200 text-foreground text-sm font-light rounded-full">
                  Creative Intelligence
                </div>
                <div className="px-4 py-2 border border-slate-200 text-foreground text-sm font-light rounded-full">
                  Human-Centric
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-6 pt-20 pb-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-light text-foreground leading-tight mb-6">
            Our AI research lab
          </h1>
          <p className="text-xl text-foreground font-light leading-relaxed max-w-3xl">
            Building the next generation of AI that understands and enhances human creativity through our Emotional Audiovisual Language Model.
          </p>
        </div>
      </div>

      {/* Data Quality Section */}
      <div className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-light text-foreground mb-6">
                The Power of High-Quality Data
              </h2>
              <p className="text-xl text-foreground font-light max-w-4xl mx-auto leading-relaxed">
                AI model quality is directly linked to training data quality. While others use scraped internet data, 
                we're building on ethically-sourced, creator-contributed content rich with intentionality.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 bg-white rounded-xl border border-slate-200">
                <h3 className="text-xl font-light mb-4 text-foreground">Ethical Data</h3>
                <p className="text-foreground font-light leading-relaxed">
                  Rights-first, voluntarily contributed dataset from creators using our platform. 
                  Clean, consented, and imbued with creative professional intentionality.
                </p>
              </div>

              <div className="p-8 bg-white rounded-xl border border-slate-200">
                <h3 className="text-xl font-light mb-4 text-foreground">Creative Intent</h3>
                <p className="text-foreground font-light leading-relaxed">
                  Data rich with creative purpose from filmmakers, advertisers, and artists. 
                  Understanding not just what people watch, but why creators made it.
                </p>
              </div>

              <div className="p-8 bg-white rounded-xl border border-slate-200">
                <h3 className="text-xl font-light mb-4 text-foreground">Trust-Built Moat</h3>
                <p className="text-foreground font-light leading-relaxed">
                  Defensible advantage through community collaboration. 
                  A repository of human creativity annotated by creators themselves.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="bg-slate-50 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Image Section */}
            <div className="mb-16">
              <img 
                src={aiNeuralNetwork} 
                alt="AI Neural Network Visualization" 
                className="rounded-xl w-full max-w-4xl mx-auto"
              />
            </div>
            
            <div className="text-center mb-16">
              <h2 className="text-3xl font-light text-foreground mb-6">
                Transforming Industries
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="p-8 bg-white rounded-xl border border-slate-200">
                <h4 className="font-light text-foreground mb-4 text-lg">Advertising & Marketing</h4>
                <p className="text-foreground font-light leading-relaxed">Emotional resonance testing and cross-cultural insights</p>
              </div>
              
              <div className="p-8 bg-white rounded-xl border border-slate-200">
                <h4 className="font-light text-foreground mb-4 text-lg">Film & TV Studios</h4>
                <p className="text-foreground font-light leading-relaxed">Script analysis and character development insights</p>
              </div>
              
              <div className="p-8 bg-white rounded-xl border border-slate-200">
                <h4 className="font-light text-foreground mb-4 text-lg">Generative Tools</h4>
                <p className="text-foreground font-light leading-relaxed">Emotionally-aware video and dynamic sound design</p>
              </div>
              
              <div className="p-8 bg-white rounded-xl border border-slate-200">
                <h4 className="font-light text-foreground mb-4 text-lg">Media Platforms</h4>
                <p className="text-foreground font-light leading-relaxed">Emotion-based content curation and recommendations</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* IP Strategy */}
      <div className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-light text-foreground mb-6">
                Intellectual Property Portfolio
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-8 bg-white rounded-xl border border-slate-200">
                <h3 className="text-lg font-light mb-4 text-foreground">Emotion-Narrative Fusion</h3>
                <p className="text-foreground font-light leading-relaxed">
                  Novel methods fusing emotional data with narrative structures beyond simple recognition.
                </p>
              </div>
              
              <div className="text-center p-8 bg-white rounded-xl border border-slate-200">
                <h3 className="text-lg font-light mb-4 text-foreground">Explainable AI</h3>
                <p className="text-foreground font-light leading-relaxed">
                  Transparent analysis with real-time saliency maps and narrative critiques.
                </p>
              </div>
              
              <div className="text-center p-8 bg-white rounded-xl border border-slate-200">
                <h3 className="text-lg font-light mb-4 text-foreground">Interactive Critique</h3>
                <p className="text-foreground font-light leading-relaxed">
                  Two-way creator-AI conversation systems for collaborative iterative feedback.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-light mb-8 text-foreground leading-tight">
              Ready to Shape the Future of Creative AI?
            </h2>
            <p className="text-xl text-foreground font-light mb-12 leading-relaxed max-w-2xl mx-auto">
              Join us in revolutionizing how artificial intelligence understands and enhances human creativity.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link to="/explore">
                <Button size="lg" className="px-10 py-6 text-lg font-light rounded-full">
                  Explore Our Technology
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" size="lg" className="px-10 py-6 text-lg font-light rounded-full">
                  Contact Our Team
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
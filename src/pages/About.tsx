import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { useTranslation } from 'react-i18next';
import { 
  Heart, 
  Brain, 
  Users, 
  Shield, 
  Lightbulb, 
  Lock, 
  BarChart3, 
  Target, 
  Globe, 
  Film, 
  FileText, 
  UserCheck, 
  Wand2, 
  Music, 
  Sparkles, 
  Cpu, 
  Eye, 
  MessageSquare,
  Rocket,
  Mail
} from 'lucide-react';
import aiNeuralNetwork from '@/assets/ai-neural-network.jpg';
import humanAiCollaboration from '@/assets/human-ai-collaboration.jpg';

export const About: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background relative">
      <Navigation />
      
      {/* Progress dots - Visual flow indicator */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-10 hidden lg:flex flex-col gap-4">
        <div className="w-2 h-2 rounded-full bg-primary opacity-60"></div>
        <div className="w-1 h-8 bg-gradient-to-b from-primary/20 to-transparent"></div>
        <div className="w-2 h-2 rounded-full bg-primary/40"></div>
        <div className="w-1 h-8 bg-gradient-to-b from-primary/20 to-transparent"></div>
        <div className="w-2 h-2 rounded-full bg-primary/40"></div>
        <div className="w-1 h-8 bg-gradient-to-b from-primary/20 to-transparent"></div>
        <div className="w-2 h-2 rounded-full bg-primary/40"></div>
      </div>
      
      {/* Mission Section */}
      <div className="container mx-auto px-6 py-16 animate-fade-in">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-light text-foreground mb-8 animate-fade-in [animation-delay:200ms] text-center lg:text-left">{t('about.mission.title')}</h2>
              <p className="text-lg text-foreground font-light leading-relaxed mb-8 animate-fade-in [animation-delay:400ms]">
                {t('about.mission.description')}
              </p>
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start animate-fade-in [animation-delay:600ms]">
                <div className="px-4 py-2 border border-slate-200 text-foreground text-sm font-light rounded-full transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-primary/5 hover:border-primary/30 cursor-default flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary/60" />
                  {t('about.mission.ethicalAI')}
                </div>
                <div className="px-4 py-2 border border-slate-200 text-foreground text-sm font-light rounded-full transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-primary/5 hover:border-primary/30 cursor-default flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary/60" />
                  {t('about.mission.creativeIntelligence')}
                </div>
                <div className="px-4 py-2 border border-slate-200 text-foreground text-sm font-light rounded-full transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-primary/5 hover:border-primary/30 cursor-default flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary/60" />
                  {t('about.mission.humanCentric')}
                </div>
              </div>
            </div>
            <div className="animate-fade-in [animation-delay:800ms]">
              <img 
                src={humanAiCollaboration} 
                alt="Human AI Collaboration" 
                className="rounded-xl w-full transition-all duration-500 hover:scale-105"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data Quality Section */}
      <div className="py-20 relative">
        {/* Subtle connecting line */}
        <div className="absolute left-1/2 top-0 w-px h-20 bg-gradient-to-b from-transparent to-primary/20 transform -translate-x-1/2"></div>
        
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 animate-fade-in">
              <h2 className="text-3xl font-light text-foreground mb-6">
                {t('about.dataQuality.title')}
              </h2>
              <p className="text-xl text-foreground font-light max-w-4xl mx-auto leading-relaxed mb-8">
                {t('about.dataQuality.description')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <div className="p-8 bg-white rounded-xl border border-slate-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-2 hover:border-primary/20 animate-fade-in [animation-delay:200ms]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{t('about.dataQuality.ethicalData.title')}</h3>
                </div>
                <p className="text-foreground font-light leading-relaxed">
                  {t('about.dataQuality.ethicalData.description')}
                </p>
              </div>

              <div className="p-8 bg-white rounded-xl border border-slate-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-2 hover:border-primary/20 animate-fade-in [animation-delay:400ms]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Lightbulb className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">The Power of Intentionality</h3>
                </div>
                <p className="text-foreground font-light leading-relaxed">
                  Scraped internet content captures what people watch, but not why they created it. Our data, contributed by filmmakers, advertisers, and artists, is rich with creative purpose. Our AVLM goes beyond a basic emotional fingerprint and understands the narrative beats, creative tropes, and emotional arcs that make content truly great.
                </p>
              </div>

              <div className="p-8 bg-white rounded-xl border border-slate-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-2 hover:border-primary/20 animate-fade-in [animation-delay:600ms]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Lock className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Built on Trust</h3>
                </div>
                <p className="text-foreground font-light leading-relaxed">
                  Our data is not just a collection of pixels and audio waves; it is a repository of human creativity and emotion, annotated by the creators themselves. This proprietary dataset will allow us to train a model with a level of depth and nuance no other company can achieve.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="bg-slate-50 py-20 relative">
        {/* Subtle connecting line */}
        <div className="absolute left-1/2 top-0 w-px h-20 bg-gradient-to-b from-primary/20 to-transparent transform -translate-x-1/2"></div>
        
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Description before image */}
            <div className="text-center mb-16 animate-fade-in">
              <h1 className="text-3xl md:text-4xl font-light text-foreground leading-tight mb-6">
                Our AI research lab
              </h1>
              <p className="text-xl text-foreground font-light leading-relaxed max-w-3xl mx-auto">
                Building the next generation of AI that understands and enhances human creativity through our Emotional Audiovisual Language Model.
              </p>
            </div>
            
            {/* Image Section with floating animation */}
            <div className="mb-16 animate-fade-in [animation-delay:300ms]">
              <img 
                src={aiNeuralNetwork} 
                alt="AI Neural Network Visualization" 
                className="rounded-xl w-full max-w-4xl mx-auto transition-all duration-500 hover:scale-105 animate-pulse"
              />
            </div>
            
              <div className="text-center mb-16 animate-fade-in [animation-delay:500ms]">
                <h2 className="text-3xl font-light text-foreground mb-6">
                  {t('about.aiLab.useCases.title')}
                </h2>
                <p className="text-xl text-foreground font-light max-w-4xl mx-auto leading-relaxed mb-8">
                  {t('about.aiLab.useCases.description')}
                </p>
              </div>

            {/* Creative Analytics */}
            <div className="mb-16">
              <h3 className="text-2xl font-light text-foreground mb-8 animate-fade-in">Creative Analytics for Advertising & Marketing:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-8 bg-white rounded-xl border border-slate-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-2 hover:border-primary/20 animate-fade-in [animation-delay:200ms]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-primary" />
                    </div>
                    <h4 className="font-bold text-foreground text-lg">Emotional Resonance Testing</h4>
                  </div>
                  <p className="text-foreground font-light leading-relaxed">
                    Analyze how an audience emotionally connects with an ad at a granular level, pinpointing moments of awe, frustration, or delight.
                  </p>
                </div>
                
                <div className="p-8 bg-white rounded-xl border border-slate-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-2 hover:border-primary/20 animate-fade-in [animation-delay:400ms]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Target className="w-5 h-5 text-primary" />
                    </div>
                    <h4 className="font-bold text-foreground text-lg">Narrative Optimization</h4>
                  </div>
                  <p className="text-foreground font-light leading-relaxed">
                    Identify which scenes or narrative beats in a campaign are most effective at driving emotional engagement and brand recall.
                  </p>
                </div>
                
                <div className="p-8 bg-white rounded-xl border border-slate-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-2 hover:border-primary/20 animate-fade-in [animation-delay:600ms]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Globe className="w-5 h-5 text-primary" />
                    </div>
                    <h4 className="font-bold text-foreground text-lg">Cross-Cultural Insights</h4>
                  </div>
                  <p className="text-foreground font-light leading-relaxed">
                    Automatically detect culturally specific emotional nuances and creative tropes to optimize content for global markets.
                  </p>
                </div>
              </div>
            </div>

            {/* Film & TV */}
            <div className="mb-16">
              <h3 className="text-2xl font-light text-foreground mb-8 animate-fade-in">Narrative Feedback for Film & TV Studios:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-8 bg-white rounded-xl border border-slate-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-2 hover:border-primary/20 animate-fade-in [animation-delay:200ms]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Film className="w-5 h-5 text-primary" />
                    </div>
                    <h4 className="font-bold text-foreground text-lg">Editing & Post-Production</h4>
                  </div>
                  <p className="text-foreground font-light leading-relaxed">
                    Provide real-time, emotional feedback to editors, helping them craft scenes that land with the intended emotional impact.
                  </p>
                </div>
                
                <div className="p-8 bg-white rounded-xl border border-slate-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-2 hover:border-primary/20 animate-fade-in [animation-delay:400ms]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <h4 className="font-bold text-foreground text-lg">Script Analysis</h4>
                  </div>
                  <p className="text-foreground font-light leading-relaxed">
                    Analyze a script's narrative arc and emotional flow before production begins, identifying potential weaknesses or opportunities.
                  </p>
                </div>
                
                <div className="p-8 bg-white rounded-xl border border-slate-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-2 hover:border-primary/20 animate-fade-in [animation-delay:600ms]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <UserCheck className="w-5 h-5 text-primary" />
                    </div>
                    <h4 className="font-bold text-foreground text-lg">Character Development</h4>
                  </div>
                  <p className="text-foreground font-light leading-relaxed">
                    Study how audiences respond to a character's emotional journey over a film or series.
                  </p>
                </div>
              </div>
            </div>

            {/* Generative AI & Media Platforms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-16">
              <div className="animate-fade-in [animation-delay:200ms]">
                <h3 className="text-2xl font-light text-foreground mb-8 flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Wand2 className="w-6 h-6 text-primary" />
                  </div>
                  Generative AI for Creative Tools:
                </h3>
                <div className="space-y-6">
                  <div className="p-6 bg-white rounded-xl border border-slate-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20">
                    <div className="flex items-center gap-3 mb-3">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <h4 className="font-bold text-foreground text-lg">Emotionally-Aware Generative Video</h4>
                    </div>
                    <p className="text-foreground font-light leading-relaxed">
                      Use our AVLM to guide text-to-video models to create content with specific emotional tones and narrative structures.
                    </p>
                  </div>
                  <div className="p-6 bg-white rounded-xl border border-slate-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20">
                    <div className="flex items-center gap-3 mb-3">
                      <Music className="w-5 h-5 text-primary" />
                      <h4 className="font-bold text-foreground text-lg">Dynamic Music & Sound Design</h4>
                    </div>
                    <p className="text-foreground font-light leading-relaxed">
                      Generate music or soundscapes that adapt to the emotional arc of a video in real-time.
                    </p>
                  </div>
                </div>
              </div>

              <div className="animate-fade-in [animation-delay:400ms]">
                <h3 className="text-2xl font-light text-foreground mb-8 flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  Personalized Media Platforms:
                </h3>
                <div className="p-8 bg-white rounded-xl border border-slate-200 transition-all duration-300 hover:shadow-lg hover:-translate-y-2 hover:border-primary/20">
                  <div className="flex items-center gap-3 mb-4">
                    <Heart className="w-5 h-5 text-primary" />
                    <h4 className="font-bold text-foreground text-lg">Emotion-Based Curation</h4>
                  </div>
                  <p className="text-foreground font-light leading-relaxed">
                    Recommend content not just by genre, but by the emotional journey it provides. For example, a "comforting" playlist of short films or an "awe-inspiring" feed of documentaries.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* IP Strategy */}
      <div className="py-20 relative">
        {/* Subtle connecting line */}
        <div className="absolute left-1/2 top-0 w-px h-20 bg-gradient-to-b from-primary/20 to-transparent transform -translate-x-1/2"></div>
        
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 animate-fade-in">
              <h2 className="text-3xl font-light text-foreground mb-6">
                Intellectual Property & Patent Areas
              </h2>
              <p className="text-xl text-foreground font-light max-w-4xl mx-auto leading-relaxed mb-8">
                We are building a robust intellectual property portfolio around our unique technology. Our patent strategy focuses on three key areas:
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3 justify-center">
              <div className="px-4 py-2 border border-slate-200 text-foreground text-sm font-light rounded-full transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-primary/5 hover:border-primary/30 cursor-default flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary/60" />
                Emotion-Narrative Fusion
              </div>
              <div className="px-4 py-2 border border-slate-200 text-foreground text-sm font-light rounded-full transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-primary/5 hover:border-primary/30 cursor-default flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary/60" />
                Explainable AV-LM
              </div>
              <div className="px-4 py-2 border border-slate-200 text-foreground text-sm font-light rounded-full transition-all duration-300 hover:scale-105 hover:shadow-md hover:bg-primary/5 hover:border-primary/30 cursor-default flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary/60" />
                Interactive Creative Critique
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 relative">
        {/* Subtle connecting line */}
        <div className="absolute left-1/2 top-0 w-px h-20 bg-gradient-to-b from-primary/20 to-transparent transform -translate-x-1/2"></div>
        
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-light mb-8 text-foreground leading-tight">
              Ready to Shape the Future of Creative AI?
            </h2>
            <p className="text-xl text-foreground font-light mb-12 leading-relaxed max-w-2xl mx-auto">
              Join us in revolutionizing how artificial intelligence understands and enhances human creativity.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center animate-fade-in [animation-delay:300ms]">
              <Link to="/explore">
                <Button size="lg" className="px-10 py-6 text-lg font-light rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center gap-2">
                  <Rocket className="w-5 h-5" />
                  Explore Our Technology
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" size="lg" className="px-10 py-6 text-lg font-light rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg hover:bg-primary/5 flex items-center gap-2">
                  <Mail className="w-5 h-5" />
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
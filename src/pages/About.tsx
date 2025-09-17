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
              <h2 className="text-4xl font-light text-foreground mb-8">About</h2>
              <p className="text-lg text-foreground font-light leading-relaxed mb-8">
                We are a technology company and a research lab developing an Emotional Audiovisual Language Model (AVLM), trained on ethically-sourced creative content. By teaching AI to understand emotion, narrative, and intention in audiovisual media, we unlock unprecedented tools for creators, brands, and platforms.
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
          <h1 className="text-3xl md:text-4xl font-light text-foreground leading-tight mb-6">
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
                Why High-Quality Data is the Key to Unlocking Emotion
              </h2>
              <p className="text-xl text-foreground font-light max-w-4xl mx-auto leading-relaxed mb-8">
                The quality of an AI model is a direct function of the data it's trained on. Today's large-scale models are built on billions of hours of scraped, low-quality, and often ethically questionable internet data. This leads to models that can recognize basic patterns but fail to grasp the rich, subtle tapestry of human emotion.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <div className="p-8 bg-white rounded-xl border border-slate-200">
                <h3 className="text-xl font-light mb-4 text-foreground">Ethical Data</h3>
                <p className="text-foreground font-light leading-relaxed">
                  We are building our foundation on a rights-first, voluntarily contributed dataset. Through our flagship product, Axessible, we've created a virtuous cycle. Creators who use our platform to make their content compliant with new regulations are also giving us permission to learn from their work. This is the Trojan source of a dataset that is not only massive but is also clean, consented, and imbued with the intentionality of creative professionals.
                </p>
              </div>

              <div className="p-8 bg-white rounded-xl border border-slate-200">
                <h3 className="text-xl font-light mb-4 text-foreground">The Power of Intentionality</h3>
                <p className="text-foreground font-light leading-relaxed">
                  Scraped internet content captures what people watch, but not why they created it. Our data, contributed by filmmakers, advertisers, and artists, is rich with creative purpose. This intentionality is the secret ingredient that allows our AVLM to go beyond a basic emotional fingerprint and understand the narrative beats, creative tropes, and emotional arcs that make content truly great.
                </p>
              </div>

              <div className="p-8 bg-white rounded-xl border border-slate-200">
                <h3 className="text-xl font-light mb-4 text-foreground">Built on Trust</h3>
                <p className="text-foreground font-light leading-relaxed">
                  By building our data set in collaboration with the creative community, we are creating a defensible moat that cannot be replicated by web scraping. Our data is not just a collection of pixels and audio waves; it is a repository of human creativity and emotion, annotated by the creators themselves. This proprietary dataset, combined with our strategic partnership with the Barcelona Supercomputing Center, will allow us to train a model with a level of depth and nuance no other company can achieve.
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
            {/* Description before image */}
            <div className="text-center mb-16">
              <p className="text-lg text-foreground font-light leading-relaxed max-w-4xl mx-auto">
                We're developing an Emotional Audiovisual Language Model (AVLM), trained on ethically-sourced creative content. By teaching AI to understand emotion, narrative, and intention in audiovisual media, we unlock unprecedented tools for creators, brands, and platforms.
              </p>
            </div>
            
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
                Broader Use Cases & IP Strategy
              </h2>
              <p className="text-xl text-foreground font-light max-w-4xl mx-auto leading-relaxed mb-8">
                The applications of an AVLM trained on a high-quality, creative-led dataset extend far beyond our initial product, Axessible. Our technology powers a new class of tools across diverse industries.
              </p>
            </div>

            {/* Creative Analytics */}
            <div className="mb-16">
              <h3 className="text-2xl font-light text-foreground mb-8">Creative Analytics for Advertising & Marketing:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-8 bg-white rounded-xl border border-slate-200">
                  <h4 className="font-light text-foreground mb-4 text-lg">Emotional Resonance Testing</h4>
                  <p className="text-foreground font-light leading-relaxed">
                    Analyze how an audience emotionally connects with an ad at a granular level, pinpointing moments of awe, frustration, or delight.
                  </p>
                </div>
                
                <div className="p-8 bg-white rounded-xl border border-slate-200">
                  <h4 className="font-light text-foreground mb-4 text-lg">Narrative Optimization</h4>
                  <p className="text-foreground font-light leading-relaxed">
                    Identify which scenes or narrative beats in a campaign are most effective at driving emotional engagement and brand recall.
                  </p>
                </div>
                
                <div className="p-8 bg-white rounded-xl border border-slate-200">
                  <h4 className="font-light text-foreground mb-4 text-lg">Cross-Cultural Insights</h4>
                  <p className="text-foreground font-light leading-relaxed">
                    Automatically detect culturally specific emotional nuances and creative tropes to optimize content for global markets.
                  </p>
                </div>
              </div>
            </div>

            {/* Film & TV */}
            <div className="mb-16">
              <h3 className="text-2xl font-light text-foreground mb-8">Narrative Feedback for Film & TV Studios:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-8 bg-white rounded-xl border border-slate-200">
                  <h4 className="font-light text-foreground mb-4 text-lg">Editing & Post-Production</h4>
                  <p className="text-foreground font-light leading-relaxed">
                    Provide real-time, emotional feedback to editors, helping them craft scenes that land with the intended emotional impact.
                  </p>
                </div>
                
                <div className="p-8 bg-white rounded-xl border border-slate-200">
                  <h4 className="font-light text-foreground mb-4 text-lg">Script Analysis</h4>
                  <p className="text-foreground font-light leading-relaxed">
                    Analyze a script's narrative arc and emotional flow before production begins, identifying potential weaknesses or opportunities.
                  </p>
                </div>
                
                <div className="p-8 bg-white rounded-xl border border-slate-200">
                  <h4 className="font-light text-foreground mb-4 text-lg">Character Development</h4>
                  <p className="text-foreground font-light leading-relaxed">
                    Study how audiences respond to a character's emotional journey over a film or series.
                  </p>
                </div>
              </div>
            </div>

            {/* Generative AI & Media Platforms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-16">
              <div>
                <h3 className="text-2xl font-light text-foreground mb-8">Generative AI for Creative Tools:</h3>
                <div className="space-y-6">
                  <div className="p-6 bg-white rounded-xl border border-slate-200">
                    <h4 className="font-light text-foreground mb-3 text-lg">Emotionally-Aware Generative Video</h4>
                    <p className="text-foreground font-light leading-relaxed">
                      Use our AVLM to guide text-to-video models to create content with specific emotional tones and narrative structures.
                    </p>
                  </div>
                  <div className="p-6 bg-white rounded-xl border border-slate-200">
                    <h4 className="font-light text-foreground mb-3 text-lg">Dynamic Music & Sound Design</h4>
                    <p className="text-foreground font-light leading-relaxed">
                      Generate music or soundscapes that adapt to the emotional arc of a video in real-time.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-light text-foreground mb-8">Personalized Media Platforms:</h3>
                <div className="p-8 bg-white rounded-xl border border-slate-200">
                  <h4 className="font-light text-foreground mb-4 text-lg">Emotion-Based Curation</h4>
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
      <div className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-light text-foreground mb-6">
                Intellectual Property & Patent Areas
              </h2>
              <p className="text-xl text-foreground font-light max-w-4xl mx-auto leading-relaxed mb-8">
                We are building a robust intellectual property portfolio around our unique technology. Our patent strategy focuses on three key areas:
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-8 bg-white rounded-xl border border-slate-200">
                <h3 className="text-lg font-light mb-4 text-foreground">Emotion-Narrative Fusion</h3>
                <p className="text-foreground font-light leading-relaxed">
                  We will seek patent protection for the novel methods and models that fuse emotional data with narrative structures in audiovisual content. This goes beyond simple emotion recognition and focuses on the system's ability to identify and analyze complex relationships, such as how emotional beats contribute to a story's overall plot.
                </p>
              </div>
              
              <div className="text-center p-8 bg-white rounded-xl border border-slate-200">
                <h3 className="text-lg font-light mb-4 text-foreground">Explainable AV-LM</h3>
                <p className="text-foreground font-light leading-relaxed">
                  A core component of our technology is its explainability. We will file patents for our methods that make the AVLM's analysis transparent and understandable for human creators. This includes techniques for generating real-time saliency maps and narrative critiques that show why the model made a specific analysis, a capability that is crucial for creative professionals.
                </p>
              </div>
              
              <div className="text-center p-8 bg-white rounded-xl border border-slate-200">
                <h3 className="text-lg font-light mb-4 text-foreground">Interactive Creative Critique</h3>
                <p className="text-foreground font-light leading-relaxed">
                  We will also pursue patents for our user-facing systems that allow for a two-way conversation between the creator and the AI. This includes novel user interfaces and algorithms that turn the critique process into a collaborative, iterative loop, where the AI can suggest edits and the creator can provide feedback on the AI's analysis.
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
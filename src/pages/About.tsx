import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-32 pb-24">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-8 text-foreground leading-tight">
            About Axessible Labs
          </h1>
          <p className="text-2xl md:text-3xl text-muted-foreground mb-8 font-light leading-relaxed">
            The Human-Centric AI Lab for Creative Expression
          </p>
          <div className="w-20 h-0.5 bg-primary mb-12"></div>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-4xl">
            Our mission is to build a new generation of artificial intelligence that understands and enhances human creativity. At Axessible Labs, we're developing an Emotional Audiovisual Language Model (AVLM), a foundational technology trained on a unique, ethically-sourced dataset of creative content. We believe that by teaching AI to understand the nuances of emotion, narrative, and intention within audiovisual media, we can unlock unprecedented tools for creators, brands, and platforms.
          </p>
        </div>
      </div>

      {/* Vision Section */}
      <div className="border-t border-border/10 py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-foreground">Our Vision</h2>
            <div className="w-16 h-0.5 bg-primary mb-12"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              <div className="space-y-8">
                <p className="text-lg text-muted-foreground leading-relaxed">
                  We envision a future where AI systems are not just tools for automation, but creative partners that empower human expression. Current AI models often miss the emotional subtext and narrative arcs that make content resonate.
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  By focusing on a high-dimensional understanding of human expression—beyond simple happy/sad labels—we are building a system that can explain why a piece of content works. This will enable creators to make more impactful work, studios to craft more compelling stories, and brands to forge deeper connections with their audiences.
                </p>
              </div>
              <div className="bg-gradient-to-br from-secondary/5 to-accent/5 rounded-lg p-8 h-fit">
                <h3 className="text-xl font-semibold mb-4 text-foreground">Key Differentiator</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Understanding the <em>why</em> behind emotional impact, not just the <em>what</em>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* High-Quality Data Section */}
      <div className="border-t border-border/10 py-24 bg-secondary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-foreground">
              Why High-Quality Data is the Key to Unlocking Emotion
            </h2>
            <div className="w-16 h-0.5 bg-primary mb-12"></div>
            <p className="text-xl text-muted-foreground mb-16 leading-relaxed">
              The quality of an AI model is a direct function of the data it's trained on. Today's large-scale models are built on billions of hours of scraped, low-quality, and often ethically questionable internet data. This leads to models that can recognize basic patterns but fail to grasp the rich, subtle tapestry of human emotion.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold text-foreground">Ethical Data</h3>
                <div className="w-12 h-0.5 bg-primary"></div>
                <p className="text-muted-foreground leading-relaxed">
                  We are building our foundation on a rights-first, voluntarily contributed dataset. Through our flagship product, Axessible, we've created a virtuous cycle. Creators who use our platform to make their content compliant with new regulations are also giving us permission to learn from their work. This is the Trojan source of a dataset that is not only massive but is also clean, consented, and imbued with the intentionality of creative professionals.
                </p>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold text-foreground">The Power of Intentionality</h3>
                <div className="w-12 h-0.5 bg-primary"></div>
                <p className="text-muted-foreground leading-relaxed">
                  Scraped internet content captures what people watch, but not why they created it. Our data, contributed by filmmakers, advertisers, and artists, is rich with creative purpose. This intentionality is the secret ingredient that allows our AVLM to go beyond a basic emotional fingerprint and understand the narrative beats, creative tropes, and emotional arcs that make content truly great.
                </p>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold text-foreground">A Moat Built on Trust</h3>
                <div className="w-12 h-0.5 bg-primary"></div>
                <p className="text-muted-foreground leading-relaxed">
                  By building our data set in collaboration with the creative community, we are creating a defensible moat that cannot be replicated by web scraping. Our data is not just a collection of pixels and audio waves; it is a repository of human creativity and emotion, annotated by the creators themselves. This proprietary dataset, combined with our strategic partnership with the Barcelona Supercomputing Center, will allow us to train a model with a level of depth and nuance no other company can achieve.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="border-t border-border/10 py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-foreground">
              Broader Use Cases & IP Strategy
            </h2>
            <div className="w-16 h-0.5 bg-primary mb-12"></div>
            <p className="text-xl text-muted-foreground mb-16 leading-relaxed">
              The applications of an AVLM trained on a high-quality, creative-led dataset extend far beyond our initial product, Axessible. Our technology will power a new class of tools across diverse industries.
            </p>

            <div className="space-y-16">
              {/* Creative Analytics */}
              <div>
                <h3 className="text-3xl font-semibold mb-8 text-foreground">Creative Analytics for Advertising & Marketing</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-foreground">Emotional Resonance Testing</h4>
                    <p className="text-muted-foreground">
                      Analyze how an audience emotionally connects with an ad at a granular level, pinpointing moments of awe, frustration, or delight.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-foreground">Narrative Optimization</h4>
                    <p className="text-muted-foreground">
                      Identify which scenes or narrative beats in a campaign are most effective at driving emotional engagement and brand recall.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-foreground">Cross-Cultural Insights</h4>
                    <p className="text-muted-foreground">
                      Automatically detect culturally specific emotional nuances and creative tropes to optimize content for global markets.
                    </p>
                  </div>
                </div>
              </div>

              {/* Narrative Feedback */}
              <div>
                <h3 className="text-3xl font-semibold mb-8 text-foreground">Narrative Feedback for Film & TV Studios</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-foreground">Editing & Post-Production</h4>
                    <p className="text-muted-foreground">
                      Provide real-time, emotional feedback to editors, helping them craft scenes that land with the intended emotional impact.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-foreground">Script Analysis</h4>
                    <p className="text-muted-foreground">
                      Analyze a script's narrative arc and emotional flow before production begins, identifying potential weaknesses or opportunities.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-foreground">Character Development</h4>
                    <p className="text-muted-foreground">
                      Study how audiences respond to a character's emotional journey over a film or series.
                    </p>
                  </div>
                </div>
              </div>

              {/* Generative AI */}
              <div>
                <h3 className="text-3xl font-semibold mb-8 text-foreground">Generative AI for Creative Tools</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-foreground">Emotionally-Aware Generative Video</h4>
                    <p className="text-muted-foreground">
                      Use our AVLM to guide text-to-video models to create content with specific emotional tones and narrative structures.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-foreground">Dynamic Music & Sound Design</h4>
                    <p className="text-muted-foreground">
                      Generate music or soundscapes that adapt to the emotional arc of a video in real-time.
                    </p>
                  </div>
                </div>
              </div>

              {/* Personalized Media */}
              <div>
                <h3 className="text-3xl font-semibold mb-8 text-foreground">Personalized Media Platforms</h3>
                <div className="space-y-3">
                  <h4 className="text-lg font-semibold text-foreground">Emotion-Based Curation</h4>
                  <p className="text-muted-foreground">
                    Recommend content not just by genre, but by the emotional journey it provides. For example, a "comforting" playlist of short films or an "awe-inspiring" feed of documentaries.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* IP Strategy Section */}
      <div className="border-t border-border/10 py-24 bg-secondary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-foreground">
              Intellectual Property & Patent Areas
            </h2>
            <div className="w-16 h-0.5 bg-primary mb-12"></div>
            <p className="text-xl text-muted-foreground mb-16 leading-relaxed">
              We are building a robust intellectual property portfolio around our unique technology. Our patent strategy focuses on three key areas:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold text-foreground">Emotion-Narrative Fusion</h3>
                <div className="w-12 h-0.5 bg-primary"></div>
                <p className="text-muted-foreground leading-relaxed">
                  We will seek patent protection for the novel methods and models that fuse emotional data with narrative structures in audiovisual content. This goes beyond simple emotion recognition and focuses on the system's ability to identify and analyze complex relationships, such as how emotional beats contribute to a story's overall plot.
                </p>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold text-foreground">Explainable AV-LM</h3>
                <div className="w-12 h-0.5 bg-primary"></div>
                <p className="text-muted-foreground leading-relaxed">
                  A core component of our technology is its explainability. We will file patents for our methods that make the AVLM's analysis transparent and understandable for human creators. This includes techniques for generating real-time saliency maps and narrative critiques that show why the model made a specific analysis, a capability that is crucial for creative professionals.
                </p>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold text-foreground">Interactive Creative Critique</h3>
                <div className="w-12 h-0.5 bg-primary"></div>
                <p className="text-muted-foreground leading-relaxed">
                  We will also pursue patents for our user-facing systems that allow for a two-way conversation between the creator and the AI. This includes novel user interfaces and algorithms that turn the critique process into a collaborative, iterative loop, where the AI can suggest edits and the creator can provide feedback on the AI's analysis.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t border-border/10 py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-foreground leading-tight">
              Ready to Experience the Future of Creative AI?
            </h2>
            <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
              Join us in revolutionizing how AI understands and enhances human creativity.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link to="/explore">
                <Button size="lg" className="px-8 py-4 text-lg font-medium">
                  Explore Our Technology
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" size="lg" className="px-8 py-4 text-lg font-medium">
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
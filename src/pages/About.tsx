import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  Heart, 
  Lightbulb, 
  Shield, 
  Target, 
  Users, 
  Sparkles, 
  Video, 
  Music, 
  Palette, 
  FileText,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10">
      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge variant="outline" className="mb-6 px-4 py-2">
            <Brain className="w-4 h-4 mr-2" />
            The Human-Centric AI Lab
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            About <span className="text-primary">Axessible Labs</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Building a new generation of artificial intelligence that understands and enhances human creativity through our Emotional Audiovisual Language Model (AVLM).
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
                <Target className="w-8 h-8 text-primary" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent className="text-lg text-muted-foreground leading-relaxed">
              <p className="mb-6">
                At Axessible Labs, we're developing an Emotional Audiovisual Language Model (AVLM), 
                a foundational technology trained on a unique, ethically-sourced dataset of creative content. 
                We believe that by teaching AI to understand the nuances of emotion, narrative, and intention 
                within audiovisual media, we can unlock unprecedented tools for creators, brands, and platforms.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4 flex items-center justify-center gap-3">
              <Sparkles className="w-8 h-8 text-primary" />
              Our Vision
            </h2>
          </div>
          
          <Card className="bg-card border-border">
            <CardContent className="p-8">
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                We envision a future where AI systems are not just tools for automation, but creative partners 
                that empower human expression. Current AI models often miss the emotional subtext and narrative 
                arcs that make content resonate.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                By focusing on a high-dimensional understanding of human expression—beyond simple happy/sad labels—we 
                are building a system that can explain why a piece of content works. This will enable creators to 
                make more impactful work, studios to craft more compelling stories, and brands to forge deeper 
                connections with their audiences.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* High-Quality Data Section */}
      <section className="py-16 px-6 bg-secondary/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4 flex items-center justify-center gap-3">
              <Heart className="w-8 h-8 text-primary" />
              Why High-Quality Data is the Key to Unlocking Emotion
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-card border-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Shield className="w-6 h-6 text-primary" />
                  Ethical Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We are building our foundation on a rights-first, voluntarily contributed dataset. 
                  Through our flagship product, Axessible, we've created a virtuous cycle where creators 
                  give us permission to learn from their work.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Lightbulb className="w-6 h-6 text-primary" />
                  The Power of Intentionality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Our data, contributed by filmmakers, advertisers, and artists, is rich with creative 
                  purpose. This intentionality allows our AVLM to understand narrative beats, creative 
                  tropes, and emotional arcs.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Users className="w-6 h-6 text-primary" />
                  A Moat Built on Trust
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  By building our dataset in collaboration with the creative community, we are creating 
                  a defensible moat. Our data is a repository of human creativity and emotion, annotated 
                  by the creators themselves.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Broader Use Cases & IP Strategy
            </h2>
            <p className="text-lg text-muted-foreground">
              The applications of our AVLM extend far beyond our initial product, powering a new class of tools across diverse industries.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Video className="w-7 h-7 text-primary" />
                  Creative Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Emotional Resonance Testing</h4>
                  <p className="text-muted-foreground text-sm">
                    Analyze how an audience emotionally connects with an ad at a granular level, 
                    pinpointing moments of awe, frustration, or delight.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Narrative Optimization</h4>
                  <p className="text-muted-foreground text-sm">
                    Identify which scenes or narrative beats in a campaign are most effective 
                    at driving emotional engagement and brand recall.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Cross-Cultural Insights</h4>
                  <p className="text-muted-foreground text-sm">
                    Automatically detect culturally specific emotional nuances and creative 
                    tropes to optimize content for global markets.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-secondary/5 to-accent/5 border-secondary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Palette className="w-7 h-7 text-primary" />
                  Narrative Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Editing & Post-Production</h4>
                  <p className="text-muted-foreground text-sm">
                    Provide real-time, emotional feedback to editors, helping them craft 
                    scenes that land with the intended emotional impact.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Script Analysis</h4>
                  <p className="text-muted-foreground text-sm">
                    Analyze a script's narrative arc and emotional flow before production 
                    begins, identifying potential weaknesses or opportunities.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Character Development</h4>
                  <p className="text-muted-foreground text-sm">
                    Study how audiences respond to a character's emotional journey 
                    over a film or series.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Sparkles className="w-7 h-7 text-primary" />
                  Generative AI Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Emotionally-Aware Video</h4>
                  <p className="text-muted-foreground text-sm">
                    Use our AVLM to guide text-to-video models to create content with 
                    specific emotional tones and narrative structures.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Dynamic Music & Sound</h4>
                  <p className="text-muted-foreground text-sm">
                    Generate music or soundscapes that adapt to the emotional arc 
                    of a video in real-time.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Music className="w-7 h-7 text-primary" />
                  Personalized Media
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Emotion-Based Curation</h4>
                  <p className="text-muted-foreground text-sm">
                    Recommend content not just by genre, but by the emotional journey it provides. 
                    For example, a "comforting" playlist of short films or an "awe-inspiring" 
                    feed of documentaries.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* IP Strategy Section */}
      <section className="py-16 px-6 bg-secondary/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Intellectual Property & Patent Areas
            </h2>
            <p className="text-lg text-muted-foreground">
              We are building a robust intellectual property portfolio around our unique technology.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-card border-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Brain className="w-6 h-6 text-primary" />
                  Emotion-Narrative Fusion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Novel methods and models that fuse emotional data with narrative structures 
                  in audiovisual content, going beyond simple emotion recognition.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <FileText className="w-6 h-6 text-primary" />
                  Explainable AV-LM
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Methods that make the AVLM's analysis transparent and understandable for 
                  human creators, including real-time saliency maps and narrative critiques.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Users className="w-6 h-6 text-primary" />
                  Interactive Creative Critique
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  User-facing systems that allow for a two-way conversation between the creator 
                  and the AI, turning the critique process into a collaborative, iterative loop.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Ready to Experience the Future of Creative AI?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join us in revolutionizing how AI understands and enhances human creativity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/explore">
              <Button size="lg" className="px-8 py-4 text-lg font-semibold">
                Explore Our Technology
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline" size="lg" className="px-8 py-4 text-lg font-semibold">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
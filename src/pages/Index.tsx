import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Play, Upload, Eye, Ear, Hand } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-background via-muted/20 to-primary/5 py-24 lg:py-32 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-foreground leading-none mb-8">
              Where Every Story is <span className="text-primary">Truly Seen</span>, 
              <span className="block">Heard, and Felt.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-12">
              The world's first video platform designed for everyone - powered by captions with intention, 
              creative audio descriptions, and immersive accessibility tools.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button asChild size="lg" className="px-8 py-4 text-lg font-semibold rounded-full">
                <Link to="/explore">
                  <Play className="w-5 h-5 mr-2" />
                  Watch Accessible Videos
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="px-8 py-4 text-lg font-semibold rounded-full">
                <Link to="/upload">
                  <Upload className="w-5 h-5 mr-2" />
                  Share Your Content
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: Why We Exist */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-black text-foreground mb-8">
              Because most videos leave someone out.
            </h2>
            <div className="space-y-6 text-lg text-muted-foreground max-w-3xl mx-auto">
              <p>On other platforms, videos are easy to share - but not always easy to experience.</p>
              <div className="grid md:grid-cols-3 gap-6 my-12">
                <div className="text-center">
                  <p className="font-semibold text-foreground">Captions miss the nuance.</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">Audio descriptions are rare or robotic.</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">Sign language? Almost never.</p>
                </div>
              </div>
              <p className="text-xl font-semibold text-primary">
                We believe access isn't a feature. It's the future of storytelling.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: The Axessible Experience */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black text-center text-foreground mb-16">
              Video without barriers.
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Eye className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Captions with Intention</h3>
                <p className="text-muted-foreground">
                  More than words. Dynamic, expressive captions that move, pause, and flow with emotion.
                </p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Ear className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Creative Audio Descriptions</h3>
                <p className="text-muted-foreground">
                  Not robotic - but cinematic narration that paints the scene, so those who listen feel everything.
                </p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Hand className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Work with us to create Sign Language Descriptions for your videos</h3>
                <p className="text-muted-foreground">
                  Driven by experts, making inclusion natural.
                </p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Play className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Universal Player</h3>
                <p className="text-muted-foreground">
                  Designed for everyone: adjust text size, color, playback, narration speed - all in one simple player.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: For Viewers */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-black text-foreground mb-8">
              Delight in a richer way to watch.
            </h2>
            <div className="space-y-6 text-lg text-muted-foreground mb-12">
              <p>Axessible isn't just for people with disabilities. It's for anyone who loves stories:</p>
              <div className="grid md:grid-cols-3 gap-6 my-8">
                <div className="bg-card p-6 rounded-lg border">
                  <p className="font-semibold text-foreground">Captions that double as design.</p>
                </div>
                <div className="bg-card p-6 rounded-lg border">
                  <p className="font-semibold text-foreground">Narration that adds dimension.</p>
                </div>
                <div className="bg-card p-6 rounded-lg border">
                  <p className="font-semibold text-foreground">Sign language as living art.</p>
                </div>
              </div>
              <p className="text-xl font-semibold text-primary">Watching here feels more human.</p>
            </div>
            <Button asChild size="lg" className="px-8 py-4 text-lg font-semibold rounded-full">
              <Link to="/explore">Start Watching</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Section 4: For Creators */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-black text-foreground mb-8">
              Turn your videos into experiences everyone can share.
            </h2>
            <div className="space-y-6 text-lg text-muted-foreground mb-12">
              <p>Upload your content — and our platform transforms it with:</p>
              <div className="grid md:grid-cols-3 gap-6 my-8">
                <div className="bg-card p-6 rounded-lg border">
                  <p className="font-semibold text-foreground">AI-driven accessibility tools</p>
                </div>
                <div className="bg-card p-6 rounded-lg border">
                  <p className="font-semibold text-foreground">Human-guided refinement</p>
                </div>
                <div className="bg-card p-6 rounded-lg border">
                  <p className="font-semibold text-foreground">Automatic compliance with global accessibility standards</p>
                </div>
              </div>
              <div className="space-y-4">
                <p>So your stories don't just reach more people…</p>
                <p className="text-xl font-semibold text-primary">They move more people.</p>
              </div>
            </div>
            <Button asChild size="lg" className="px-8 py-4 text-lg font-semibold rounded-full">
              <Link to="/upload">Share Your Content</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Section 5: Community & Impact */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-black text-foreground mb-8">
              A platform built with - not just for - the community.
            </h2>
            <div className="space-y-6 text-lg text-muted-foreground mb-12">
              <p>We collaborate with deaf, blind, and disabled creators, educators, and advocates to design every feature.</p>
              <p>Every video added here helps make the internet more inclusive.</p>
              <p className="text-xl font-semibold text-primary">
                Together, we're building a library of stories that everyone can truly experience.
              </p>
            </div>
            <Button asChild variant="outline" size="lg" className="px-8 py-4 text-lg font-semibold rounded-full">
              <Link to="/explore">See Community Voices</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Section 6: Testimonials */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black text-center text-foreground mb-16">
              What People Are Saying
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-card p-8 rounded-lg border text-center">
                <p className="text-lg text-muted-foreground mb-4 italic">
                  "I finally felt like captions matched the rhythm of my laughter."
                </p>
                <p className="font-semibold text-foreground">— Viewer</p>
              </div>
              
              <div className="bg-card p-8 rounded-lg border text-center">
                <p className="text-lg text-muted-foreground mb-4 italic">
                  "My students don't just watch lessons here. They feel them."
                </p>
                <p className="font-semibold text-foreground">— Teacher</p>
              </div>
              
              <div className="bg-card p-8 rounded-lg border text-center">
                <p className="text-lg text-muted-foreground mb-4 italic">
                  "For the first time, I could follow a film without asking for help."
                </p>
                <p className="font-semibold text-foreground">— Blind Creator</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: Closing CTA */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-black text-foreground mb-6">
              Access isn't optional. It's storytelling reimagined.
            </h2>
            <p className="text-xl text-muted-foreground mb-12">
              Join the platform where every story belongs.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="px-8 py-4 text-lg font-semibold rounded-full">
                <Link to="/explore">Watch Now</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="px-8 py-4 text-lg font-semibold rounded-full">
                <Link to="/upload">Share Your Content</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted py-12">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8">
              <div className="flex items-center space-x-3 mb-4 md:mb-0">
                <img
                  src="/lovable-uploads/69bee058-9d55-465d-bec0-0156468ba560.png"
                  alt="Axessible"
                  className="h-8 w-auto"
                />
                <span className="text-sm text-muted-foreground">Hear the Unheard. See the Unseen.</span>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <div className="flex flex-wrap gap-6 text-sm">
                  <Link to="/enterprise" className="text-muted-foreground hover:text-primary transition-colors">About</Link>
                  <Link to="/explore" className="text-muted-foreground hover:text-primary transition-colors">Community</Link>
                  <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-colors">Pricing</Link>
                  <Link to="/explore" className="text-muted-foreground hover:text-primary transition-colors">Blog</Link>
                  <Link to="/enterprise" className="text-muted-foreground hover:text-primary transition-colors">Contact</Link>
                </div>
              </div>
              
              <div>
                <div className="flex flex-wrap gap-6 text-sm">
                  <Link to="/enterprise" className="text-muted-foreground hover:text-primary transition-colors">Accessibility Statement</Link>
                  <Link to="/enterprise" className="text-muted-foreground hover:text-primary transition-colors">Terms</Link>
                  <Link to="/enterprise" className="text-muted-foreground hover:text-primary transition-colors">Privacy</Link>
                </div>
              </div>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              <p>&copy; 2025 Axessible Tech, INC. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
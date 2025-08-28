import { Hero } from '@/components/Hero';
import { IndustryFirst } from '@/components/IndustryFirst';
import { MarketUrgency } from '@/components/MarketUrgency';
import { Implementation } from '@/components/Implementation';
import { EarlyAccess } from '@/components/EarlyAccess';
import { UploadAccessible } from '@/components/UploadAccessible';
import { PromptToVideo } from '@/components/PromptToVideo';
import { TechStack } from '@/components/TechStack';
import { PatentClaims } from '@/components/PatentClaims';
import { ASLClipUploader } from '@/components/ASLClipUploader';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Upload, Video, DollarSign } from 'lucide-react';
import { Navigation } from '@/components/Navigation';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <Hero />

      {/* Industry First Content */}
      <IndustryFirst />
      <MarketUrgency />
      <Implementation />

      {/* Quick Access Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4 tracking-tight">
              Get Started with Axessible Video
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Transform your video content with automatic accessibility features
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Link to="/upload" className="group">
              <div className="bg-card rounded-xl p-6 border hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-center">Upload Video</h3>
                <p className="text-muted-foreground text-center text-sm">
                  Upload your video and let AI generate captions, audio descriptions, and ASL support
                </p>
              </div>
            </Link>
            
            <Link to="/videos" className="group">
              <div className="bg-card rounded-xl p-6 border hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Video className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-center">Manage Videos</h3>
                <p className="text-muted-foreground text-center text-sm">
                  View, organize, and manage your accessible video library
                </p>
              </div>
            </Link>
            
            <Link to="/pricing" className="group">
              <div className="bg-card rounded-xl p-6 border hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-center">View Pricing</h3>
                <p className="text-muted-foreground text-center text-sm">
                  Choose the perfect plan for your accessibility needs
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>
      
      {/* ASL Clip Upload Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4 tracking-tight">
              Upload Your Custom ASL Clips
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Integrate your own sign language videos into the recipe demo for personalized accessibility
            </p>
          </div>
          <ASLClipUploader />
        </div>
      </section>
      
      <PromptToVideo />
      <TechStack />
      <PatentClaims />
    </div>
  );
};

export default Index;

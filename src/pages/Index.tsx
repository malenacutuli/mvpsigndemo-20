import { Hero } from '@/components/Hero';
import { DemoSection } from '@/components/DemoSection';
import { UploadAccessible } from '@/components/UploadAccessible';
import { PromptToVideo } from '@/components/PromptToVideo';
import { TechStack } from '@/components/TechStack';
import { PatentClaims } from '@/components/PatentClaims';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      
      {/* Featured MVP Demo - Upload & Test All Features */}
      <section className="py-16 bg-gradient-accessibility">
        <div className="container mx-auto px-6 text-center mb-8">
          <h2 className="text-3xl font-bold mb-4"> Complete MVP Demo</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Upload your own video to test the complete accessibility pipeline: 
            <span className="font-semibold text-foreground"> Speech-to-Text → Captions with Intention → Audio Descriptions → ASL Avatars</span>
          </p>
        </div>
        <UploadAccessible />
      </section>

      {/* Supporting Demos */}
      <DemoSection />
      <PromptToVideo />
      <TechStack />
      <PatentClaims />
    </div>
  );
};

export default Index;

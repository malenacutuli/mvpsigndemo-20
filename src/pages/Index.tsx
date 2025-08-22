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
      
      {/* Video Upload & Experience */}
      <section className="py-16 bg-gradient-accessibility">
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

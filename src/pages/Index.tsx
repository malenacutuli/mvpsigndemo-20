import { Hero } from '@/components/Hero';
import { IndustryFirst } from '@/components/IndustryFirst';
import { MarketUrgency } from '@/components/MarketUrgency';
import { Implementation } from '@/components/Implementation';
import { EarlyAccess } from '@/components/EarlyAccess';
import { DemoSection } from '@/components/DemoSection';
import { UploadAccessible } from '@/components/UploadAccessible';
import { PromptToVideo } from '@/components/PromptToVideo';
import { TechStack } from '@/components/TechStack';
import { PatentClaims } from '@/components/PatentClaims';
import { ASLClipUploader } from '@/components/ASLClipUploader';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />

      {/* Industry First Content */}
      <IndustryFirst />
      <MarketUrgency />
      <Implementation />
      <EarlyAccess />

      
      {/* ASL Clip Upload Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
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

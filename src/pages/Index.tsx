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

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />

      {/* Industry First Content */}
      <IndustryFirst />
      <MarketUrgency />
      <Implementation />
      <EarlyAccess />

      {/* Supporting Demos */}
      <DemoSection />
      <PromptToVideo />
      <TechStack />
      <PatentClaims />
    </div>
  );
};

export default Index;

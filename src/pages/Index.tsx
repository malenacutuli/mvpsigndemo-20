import { Hero } from '@/components/Hero';
import { DemoSection } from '@/components/DemoSection';
import { TechStack } from '@/components/TechStack';
import { PatentClaims } from '@/components/PatentClaims';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <DemoSection />
      <TechStack />
      <PatentClaims />
    </div>
  );
};

export default Index;

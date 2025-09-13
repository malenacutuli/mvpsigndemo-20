import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, Cpu, Mic, Eye, Brain, Shield, Zap, Code } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const TechStack: React.FC = () => {
  const { t } = useTranslation();
  
  const techCategories = [
    {
      icon: <Cloud className="w-6 h-6" />,
      title: t('techStack.categories.cloudInfrastructure.title'),
      description: t('techStack.categories.cloudInfrastructure.description'),
      technologies: [] as string[]
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: t('techStack.categories.aiMachineLearning.title'),
      description: t('techStack.categories.aiMachineLearning.description'),
      technologies: t('techStack.categories.aiMachineLearning.technologies', { returnObjects: true }) as string[]
    },
    {
      icon: <Mic className="w-6 h-6" />,
      title: t('techStack.categories.voiceAudio.title'),
      description: t('techStack.categories.voiceAudio.description'),
      technologies: t('techStack.categories.voiceAudio.technologies', { returnObjects: true }) as string[]
    },
    {
      icon: <Eye className="w-6 h-6" />,
      title: t('techStack.categories.computerVision.title'),
      description: t('techStack.categories.computerVision.description'),
      technologies: t('techStack.categories.computerVision.technologies', { returnObjects: true }) as string[]
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: t('techStack.categories.complianceSecurity.title'),
      description: t('techStack.categories.complianceSecurity.description'),
      technologies: t('techStack.categories.complianceSecurity.technologies', { returnObjects: true }) as string[]
    }
  ];

  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Zap className="w-4 h-4 mr-2" />
            {t('techStack.badge')}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t('techStack.title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('techStack.description')}
          </p>
        </div>

        {/* Technology Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {techCategories.map((category, index) => (
            <Card key={index} className="bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {category.icon}
                  </div>
                  <CardTitle className="text-lg">{category.title}</CardTitle>
                </div>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {category.technologies.length > 0 ? (
                    category.technologies.map((tech, techIndex) => (
                      <Badge 
                        key={techIndex} 
                        variant="outline" 
                        className="text-xs font-medium"
                      >
                        {tech}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      {category.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Architecture Highlights */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-8">{t('techStack.architectureHighlights.title')}</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Cpu className="w-8 h-8 text-primary" />
              </div>
              <h4 className="font-semibold mb-2">{t('techStack.architectureHighlights.gpu.title')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('techStack.architectureHighlights.gpu.description')}
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-accent" />
              </div>
              <h4 className="font-semibold mb-2">{t('techStack.architectureHighlights.eventDriven.title')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('techStack.architectureHighlights.eventDriven.description')}
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-cwi-main-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-cwi-main-green" />
              </div>
              <h4 className="font-semibold mb-2">{t('techStack.architectureHighlights.complianceFirst.title')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('techStack.architectureHighlights.complianceFirst.description')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
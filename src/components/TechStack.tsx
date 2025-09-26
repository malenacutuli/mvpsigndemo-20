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
    <section className="py-32 bg-secondary/20">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-20">
          <Badge variant="secondary" className="mb-4 text-sm font-light px-4 py-2">
            <Zap className="w-4 h-4 mr-2" />
            {t('techStack.badge')}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-light text-foreground mb-8 leading-tight">
            {t('techStack.title')}
          </h2>
          <p className="text-xl text-muted-foreground font-light max-w-3xl mx-auto leading-relaxed">
            {t('techStack.description')}
          </p>
        </div>

        {/* Technology Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-10 max-w-6xl mx-auto">
          {techCategories.map((category, index) => (
            <Card key={index} className="bg-card border shadow-soft hover:shadow-elegant transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {category.icon}
                  </div>
                  <CardTitle className="text-xl font-light">{category.title}</CardTitle>
                </div>
                <CardDescription className="font-light">{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {category.technologies.length > 0 ? (
                    category.technologies.map((tech, techIndex) => (
                      <Badge 
                        key={techIndex} 
                        variant="outline" 
                        className="text-xs font-light"
                      >
                        {tech}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground font-light italic">
                      {category.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
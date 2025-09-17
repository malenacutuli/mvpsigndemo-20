import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Play, Upload, Eye, Ear, Hand } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Index = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative bg-background py-20 sm:py-28 lg:py-40 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="space-y-8">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-foreground leading-tight tracking-tight break-words px-2">
                {t('hero.title')}{" "}
                <span className="text-primary block">{t('hero.titleAccent')}</span>{" "}
                <span className="block">{t('hero.titleEnd')}</span>
              </h1>
              
              <p className="text-base sm:text-lg md:text-xl text-foreground font-light leading-relaxed max-w-3xl mx-auto px-4">
                {t('hero.subtitle')}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center">
                <Button asChild size="lg" className="px-10 py-6 text-lg font-light rounded-full h-auto">
                  <Link to="/explore">
                    <Play className="w-5 h-5 mr-3" />
                    {t('hero.startWatching')}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="px-10 py-6 text-lg font-light rounded-full h-auto">
                  <Link to="/upload">
                    <Upload className="w-5 h-5 mr-3" />
                    {t('hero.shareContent')}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: Why We Exist */}
      <section className="py-32 bg-muted/20">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-light text-center text-foreground mb-20 leading-tight">
              {t('sections.whyWeExist.title')}
            </h2>
            <div className="space-y-8 text-lg text-foreground max-w-4xl mx-auto">
              <p className="text-lg font-light leading-relaxed">{t('sections.whyWeExist.description')}</p>
              <div className="grid md:grid-cols-3 gap-8 my-16">
                <div className="bg-card p-8 rounded-2xl border shadow-soft">
                  <p className="font-light text-foreground text-lg">{t('sections.whyWeExist.captionsMiss')}</p>
                </div>
                <div className="bg-card p-8 rounded-2xl border shadow-soft">
                  <p className="font-light text-foreground text-lg">{t('sections.whyWeExist.audioDescriptionsRare')}</p>
                </div>
                <div className="bg-card p-8 rounded-2xl border shadow-soft">
                  <p className="font-light text-foreground text-lg">{t('sections.whyWeExist.signLanguageNever')}</p>
                </div>
              </div>
              <p className="text-2xl font-light text-primary leading-relaxed">
                {t('sections.whyWeExist.belief')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: The Axessible Experience */}
      <section className="py-32 bg-background">
        <div className="container mx-auto px-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-light text-center text-foreground mb-20 leading-tight">
              {t('sections.axessibleExperience.title')}
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
              <div className="text-center space-y-6 group">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                  <Eye className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-light text-foreground">{t('sections.axessibleExperience.captionsTitle')}</h3>
                <p className="text-muted-foreground font-light leading-relaxed">
                  {t('sections.axessibleExperience.captionsDesc')}
                </p>
              </div>
              
              <div className="text-center space-y-6 group">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                  <Ear className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-light text-foreground">{t('sections.axessibleExperience.audioDescTitle')}</h3>
                <p className="text-muted-foreground font-light leading-relaxed">
                  {t('sections.axessibleExperience.audioDescDesc')}
                </p>
              </div>
              
              <div className="text-center space-y-6 group">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                  <Hand className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-light text-foreground">{t('sections.axessibleExperience.signLanguageTitle')}</h3>
                <p className="text-muted-foreground font-light leading-relaxed">
                  {t('sections.axessibleExperience.signLanguageDesc')}
                </p>
              </div>
              
              <div className="text-center space-y-6 group">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                  <Play className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-light text-foreground">{t('sections.axessibleExperience.playerTitle')}</h3>
                <p className="text-muted-foreground font-light leading-relaxed">
                  {t('sections.axessibleExperience.playerDesc')}
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
            <h2 className="text-4xl md:text-5xl font-light text-foreground mb-8">
              {t('sections.forViewers.title')}
            </h2>
            <div className="space-y-6 text-lg text-muted-foreground mb-12">
              <p className="font-light">{t('sections.forViewers.description')}</p>
              <div className="grid md:grid-cols-3 gap-6 my-8">
                <div className="bg-card p-6 rounded-lg border">
                  <p className="font-light text-foreground">{t('sections.forViewers.captionsDesign')}</p>
                </div>
                <div className="bg-card p-6 rounded-lg border">
                  <p className="font-light text-foreground">{t('sections.forViewers.narrationDimension')}</p>
                </div>
                <div className="bg-card p-6 rounded-lg border">
                  <p className="font-light text-foreground">{t('sections.forViewers.signLanguageArt')}</p>
                </div>
              </div>
              <p className="text-xl font-light text-primary">{t('sections.forViewers.watchingFeels')}</p>
            </div>
            <Button asChild size="lg" className="px-8 py-4 text-lg font-light rounded-full">
              <Link to="/explore">{t('sections.forViewers.startWatching')}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Section 4: For Creators */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-light text-foreground mb-8">
              {t('sections.forCreators.title')}
            </h2>
            <div className="space-y-6 text-lg text-muted-foreground mb-12">
              <p className="font-light">{t('sections.forCreators.description')}</p>
              <div className="grid md:grid-cols-3 gap-6 my-8">
                <div className="bg-card p-6 rounded-lg border">
                  <p className="font-light text-foreground">{t('sections.forCreators.aiTools')}</p>
                </div>
                <div className="bg-card p-6 rounded-lg border">
                  <p className="font-light text-foreground">{t('sections.forCreators.humanGuidance')}</p>
                </div>
                <div className="bg-card p-6 rounded-lg border">
                  <p className="font-light text-foreground">{t('sections.forCreators.compliance')}</p>
                </div>
              </div>
              <div className="space-y-4">
                <p className="font-light">{t('sections.forCreators.storiesReach')}</p>
                <p className="text-xl font-light text-primary">{t('sections.forCreators.storiesMove')}</p>
              </div>
            </div>
            <Button asChild size="lg" className="px-8 py-4 text-lg font-light rounded-full">
              <Link to="/upload">{t('sections.forCreators.shareContent')}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Section 5: Community & Impact */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-light text-foreground mb-8">
              {t('sections.community.title')}
            </h2>
            <div className="space-y-6 text-lg text-muted-foreground mb-12">
              <p className="font-light">{t('sections.community.collaborate')}</p>
              <p className="font-light">{t('sections.community.everyVideo')}</p>
              <p className="text-xl font-light text-primary">
                {t('sections.community.buildingLibrary')}
              </p>
              <p className="font-light">{t('sections.community.visionaries')}</p>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto px-3 py-3 text-xs sm:text-sm font-light rounded-full text-center leading-tight whitespace-normal break-words max-w-full">
              <Link to="/explore">{t('sections.community.meetPioneers')}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Section 6: Impact Statistics */}
      <section className="py-32 bg-background">
        <div className="container mx-auto px-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-light text-center text-foreground mb-20 leading-tight">
              {t('sections.testimonials.title')}
            </h2>
            
            {/* Large Impact Statistics - Eko Style */}
            <div className="grid md:grid-cols-3 gap-12 mb-20">
              <div className="text-center space-y-3">
                <div className="text-6xl md:text-8xl font-light text-foreground leading-none tracking-tight">
                  95<span className="text-primary">%</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-light text-foreground">{t('sections.testimonials.engagementIncrease')}</h3>
                  <p className="text-lg text-foreground font-light">{t('sections.testimonials.viewerEngagement')}</p>
                </div>
              </div>
              
              <div className="text-center space-y-3">
                <div className="text-6xl md:text-8xl font-light text-foreground leading-none tracking-tight">
                  78<span className="text-primary">%</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-light text-foreground">{t('sections.testimonials.betterComprehension')}</h3>
                  <p className="text-lg text-foreground font-light">{t('sections.testimonials.contentComprehension')}</p>
                </div>
              </div>
              
              <div className="text-center space-y-3">
                <div className="text-6xl md:text-8xl font-light text-foreground leading-none tracking-tight">
                  24<span className="text-primary">x</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-light text-foreground">{t('sections.testimonials.moreVideos')}</h3>
                  <p className="text-lg text-foreground font-light">{t('sections.testimonials.accessibleVideos')}</p>
                </div>
              </div>
            </div>

            {/* Testimonial Cards */}
            <div className="grid md:grid-cols-3 gap-8 mt-16">
              <div className="bg-card p-8 rounded-2xl border shadow-soft text-center group hover:shadow-elegant transition-shadow">
                <p className="text-lg text-muted-foreground mb-6 italic font-light leading-relaxed">
                  "{t('sections.testimonials.testimonial1')}"
                </p>
              </div>
              
              <div className="bg-card p-8 rounded-2xl border shadow-soft text-center group hover:shadow-elegant transition-shadow">
                <p className="text-lg text-muted-foreground mb-6 italic font-light leading-relaxed">
                  "{t('sections.testimonials.testimonial2')}"
                </p>
              </div>
              
              <div className="bg-card p-8 rounded-2xl border shadow-soft text-center group hover:shadow-elegant transition-shadow">
                <p className="text-lg text-muted-foreground mb-6 italic font-light leading-relaxed">
                  "{t('sections.testimonials.testimonial3')}"
                </p>
                
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: Closing CTA */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-light text-foreground mb-6">
              {t('sections.cta.title')}
            </h2>
            <p className="text-xl text-muted-foreground font-light mb-12">
              {t('sections.cta.subtitle')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="px-8 py-4 text-lg font-light rounded-full">
                <Link to="/explore">{t('sections.cta.watchNow')}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="px-8 py-4 text-lg font-light rounded-full">
                <Link to="/upload">{t('sections.cta.shareContent')}</Link>
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
                  src="/assets/axessible-logo.png"
                  alt="Axessible"
                  className="h-8 w-auto"
                />
                <span className="text-sm text-muted-foreground">{t('footer.tagline')}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
              <div>
                <h3 className="font-light text-foreground mb-4">{t('footer.about')}</h3>
                <div className="space-y-2 text-sm">
                  <Link to="/enterprise" className="block text-muted-foreground hover:text-primary transition-colors">{t('nav.enterprise')}</Link>
                  <Link to="/explore" className="block text-muted-foreground hover:text-primary transition-colors">{t('footer.community')}</Link>
                  <Link to="/pricing" className="block text-muted-foreground hover:text-primary transition-colors">{t('footer.pricing')}</Link>
                </div>
              </div>
              
              <div>
                <h3 className="font-light text-foreground mb-4">{t('common.feature')}</h3>
                <div className="space-y-2 text-sm">
                  <Link to="/explore" className="block text-muted-foreground hover:text-primary transition-colors">{t('nav.explore')}</Link>
                  <Link to="/upload" className="block text-muted-foreground hover:text-primary transition-colors">{t('common.upload')}</Link>
                  <Link to="/explore" className="block text-muted-foreground hover:text-primary transition-colors">{t('footer.blog')}</Link>
                </div>
              </div>
              
              <div>
                <h3 className="font-light text-foreground mb-4">{t('footer.contact')}</h3>
                <div className="space-y-2 text-sm">
                  <Link to="/contact" className="block text-muted-foreground hover:text-primary transition-colors">{t('footer.contact')}</Link>
                  <Link to="/accessibility-statement" className="block text-muted-foreground hover:text-primary transition-colors">{t('footer.accessibilityStatement')}</Link>
                </div>
              </div>
              
              <div>
                <h3 className="font-light text-foreground mb-4">{t('footer.terms')}</h3>
                <div className="space-y-2 text-sm">
                  <Link to="/terms" className="block text-muted-foreground hover:text-primary transition-colors">{t('footer.terms')}</Link>
                  <Link to="/privacy-policy" className="block text-muted-foreground hover:text-primary transition-colors">{t('footer.privacy')}</Link>
                </div>
              </div>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              <p>{t('footer.copyright')}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Play, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import accessibilityCircle from '@/assets/accessibility-circle.jpg';
import captionsWithIntention from '@/assets/captions-with-intention.jpg';
import audioDescriptions from '@/assets/audio-descriptions.jpg';
import signLanguage from '@/assets/sign-language.jpg';
import euLogo from '@/assets/eu-logo.png';
import bscLogo from '@/assets/bsc-ai-factory-logo.jpg';
import nvidiaLogo from '@/assets/nvidia-inception-logo-clean.png';
import { MovingLogoStripe } from '@/components/MovingLogoStripe';
import { InterbrandFeatures } from '@/components/InterbrandFeatures';

const Index = () => {
  const { t } = useTranslation();
  const { theme, isDemo, getPath } = useTheme();
  return (
    <div className={`min-h-screen ${isDemo ? 'bg-white' : 'bg-background'}`}>
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative bg-white py-20 sm:py-28 lg:py-40 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="space-y-8">
              {/* Tagline */}
              {isDemo && (
                <p className="text-sm md:text-base text-muted-foreground uppercase tracking-wider mb-6 font-light">
                  {theme.tagline}
                </p>
              )}
              
              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-foreground leading-tight tracking-tight break-words px-2">
                {isDemo ? (
                  theme.heroTitle
                ) : (
                  <>
                    {t('hero.title')}{" "}
                    <span className="text-primary block">{t('hero.titleAccent')}</span>{" "}
                    <span className="block">{t('hero.titleEnd')}</span>
                  </>
                )}
              </h1>
              
              {/* Subtitle */}
              <p className="text-base sm:text-lg md:text-xl text-foreground font-light leading-relaxed max-w-3xl mx-auto px-4">
                {isDemo ? theme.heroSubtitle : t('hero.subtitle')}
              </p>
              
              {!isDemo && (
                <div className="w-full max-w-2xl mx-auto py-8">
                  <img 
                    src={accessibilityCircle} 
                    alt="Accessibility features connecting people through video" 
                    className="w-full h-auto rounded-lg"
                  />
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center">
                <Button asChild size="lg" className="px-10 py-6 text-lg font-light rounded-full h-auto">
                  <Link to={isDemo ? getPath('/auth') : getPath('/explore')}>
                    <Play className="w-5 h-5 mr-3" />
                    {isDemo ? theme.ctaText : t('hero.startWatching')}
                  </Link>
                </Button>
                {!isDemo && (
                  <Button asChild variant="outline" size="lg" className="px-10 py-6 text-lg font-light rounded-full h-auto">
                    <Link to={getPath('/upload')}>
                      <Upload className="w-5 h-5 mr-3" />
                      {t('hero.shareContent')}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interbrand Features Section */}
      <InterbrandFeatures />

      {/* Recognition & Partners Section - Only for non-demo pages at top */}
      {!isDemo && (
        <section className="py-16 bg-white border-y">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <h3 className="text-xl md:text-2xl font-light text-center text-muted-foreground mb-12">
                {t('recognition.title')}
              </h3>
              <div className="flex flex-wrap items-center justify-center gap-12 md:gap-16">
                <div className="flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300">
                  <img src={euLogo} alt="European Union" className="h-16 md:h-20 w-auto object-contain" />
                </div>
                <div className="flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300">
                  <img src={bscLogo} alt="BSC AI Factory" className="h-24 md:h-28 w-auto object-contain" />
                </div>
                <div className="flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300">
                  <img src={nvidiaLogo} alt="NVIDIA Inception Program" className="h-16 md:h-20 w-auto object-contain" />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Section 1: Why We Exist */}
      {!isDemo && (
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
      )}

      {/* Enterprise CTA Section */}
      {!isDemo && (
        <section className="py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto text-center space-y-12">
            <div className="space-y-6">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-foreground leading-tight">
                {t('sections.enterpriseCTA.title')}{" "}
                <span className="block">{t('sections.enterpriseCTA.titleTime')}</span>
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground font-light max-w-3xl mx-auto">
                {t('sections.enterpriseCTA.subtitle')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button asChild size="lg" className="px-10 py-6 text-lg font-light rounded-full h-auto">
                <Link to="/upload">{t('sections.enterpriseCTA.processFirstVideo')}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="px-10 py-6 text-lg font-light rounded-full h-auto">
                <Link to="/pricing">{t('sections.enterpriseCTA.viewPricing')}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="px-10 py-6 text-lg font-light rounded-full h-auto">
                <Link to="/contact">{t('sections.enterpriseCTA.bookDemo')}</Link>
              </Button>
            </div>

            <div className="pt-12">
              <p className="text-sm text-muted-foreground font-light mb-6">
                {t('sections.enterpriseCTA.trustedBy')}
              </p>
              <MovingLogoStripe />
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Section 2: The Axessible Experience */}
      {!isDemo && (
        <section className="py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-light text-center text-foreground mb-20 leading-tight">
              {t('sections.axessibleExperience.title')}
            </h2>
            
            <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto">
              <div className="text-center space-y-6 group">
                <div className="flex items-center justify-center mx-auto h-80">
                  <img src={captionsWithIntention} alt="Captions with Intention" className="w-80 h-80 object-contain" />
                </div>
                <h3 className="text-2xl font-light text-foreground">{t('sections.axessibleExperience.captionsTitle')}</h3>
                <p className="text-muted-foreground font-light leading-relaxed">
                  {t('sections.axessibleExperience.captionsDesc')}
                </p>
              </div>
              
              <div className="text-center space-y-6 group">
                <div className="flex items-center justify-center mx-auto h-80">
                  <img src={audioDescriptions} alt="Emotive Audio Descriptions" className="w-80 h-80 object-contain" />
                </div>
                <h3 className="text-2xl font-light text-foreground">{t('sections.axessibleExperience.audioDescTitle')}</h3>
                <p className="text-muted-foreground font-light leading-relaxed">
                  {t('sections.axessibleExperience.audioDescDesc')}
                </p>
              </div>
              
              <div className="text-center space-y-6 group">
                <div className="flex items-center justify-center mx-auto h-80">
                  <img src={signLanguage} alt="Sign Language Descriptions" className="w-80 h-80 object-contain" />
                </div>
                <h3 className="text-2xl font-light text-foreground">{t('sections.axessibleExperience.signLanguageTitle')}</h3>
                <p className="text-muted-foreground font-light leading-relaxed">
                  {t('sections.axessibleExperience.signLanguageDesc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Section 3: For Viewers */}
      {!isDemo && (
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
      )}

      {/* Section 4: For Creators */}
      {!isDemo && (
        <section className="py-20 bg-white">
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
      )}

      {/* Section 5: Community & Impact */}
      {!isDemo && (
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
      )}

      {/* Section 6: Impact Statistics */}
      {!isDemo && (
        <section className="py-32 bg-white">
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
      )}

      {/* Section 7: Closing CTA */}
      {!isDemo && (
        <section className="py-20 bg-white">
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
      )}

      {/* Recognition Section - Bottom of Demo Pages Only */}
      {isDemo && (
        <section className="py-20 bg-muted/20">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center space-y-12">
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Powered by Axessible Technologies
                  </h3>
                  <p className="text-base text-muted-foreground font-light">
                    Recognized for Innovation in AI for Good
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center justify-center gap-12 md:gap-16">
                  <div className="flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300">
                    <img src={euLogo} alt="European Union" className="h-16 md:h-20 w-auto object-contain" />
                  </div>
                  <div className="flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300">
                    <img src={bscLogo} alt="BSC AI Factory" className="h-24 md:h-28 w-auto object-contain" />
                  </div>
                  <div className="flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300">
                    <img src={nvidiaLogo} alt="NVIDIA Inception Program" className="h-16 md:h-20 w-auto object-contain" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

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
                <span className="text-base font-light text-muted-foreground leading-relaxed">{t('footer.tagline')}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
              <div>
                <h3 className="font-light text-foreground mb-4">{t('footer.about')}</h3>
                <div className="space-y-2 text-base font-light">
                  <Link to="/enterprise" className="block text-muted-foreground hover:text-primary transition-colors">{t('nav.enterprise')}</Link>
                  <Link to="/explore" className="block text-muted-foreground hover:text-primary transition-colors">{t('footer.community')}</Link>
                  <Link to="/pricing" className="block text-muted-foreground hover:text-primary transition-colors">{t('footer.pricing')}</Link>
                </div>
              </div>
              
              <div>
                <h3 className="font-light text-foreground mb-4">{t('footer.features')}</h3>
                <div className="space-y-2 text-base font-light">
                  <Link to="/explore" className="block text-muted-foreground hover:text-primary transition-colors">{t('nav.explore')}</Link>
                  <Link to="/upload" className="block text-muted-foreground hover:text-primary transition-colors">{t('footer.upload')}</Link>
                  <Link to="/explore" className="block text-muted-foreground hover:text-primary transition-colors">{t('footer.blog')}</Link>
                  <a href="https://axesshuman.com" target="_blank" rel="noopener noreferrer" className="block text-muted-foreground hover:text-primary transition-colors">AVLM</a>
                </div>
              </div>
              
              <div>
                <h3 className="font-light text-foreground mb-4">{t('footer.contact')}</h3>
                <div className="space-y-2 text-base font-light">
                  <Link to="/contact" className="block text-muted-foreground hover:text-primary transition-colors">{t('footer.contact')}</Link>
                  <Link to="/accessibility-statement" className="block text-muted-foreground hover:text-primary transition-colors">{t('footer.accessibilityStatement')}</Link>
                </div>
              </div>
              
              <div>
                <h3 className="font-light text-foreground mb-4">{t('footer.terms')}</h3>
                <div className="space-y-2 text-base font-light">
                  <Link to="/terms" className="block text-muted-foreground hover:text-primary transition-colors">{t('footer.terms')}</Link>
                  <Link to="/privacy-policy" className="block text-muted-foreground hover:text-primary transition-colors">{t('footer.privacy')}</Link>
                </div>
              </div>
            </div>
            
            <div className="text-center text-base font-light text-muted-foreground">
              <p>{t('footer.copyright')}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
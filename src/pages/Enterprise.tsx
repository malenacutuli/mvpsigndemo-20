import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation } from '@/components/Navigation';
import { TechStack } from '@/components/TechStack';
import { PatentClaims } from '@/components/PatentClaims';
import {
  Upload,
  Settings,
  PlayCircle,
  Globe,
  ShieldCheck,
  UserCheck,
  Sparkles,
  Layers,
  Archive,
  ArrowRight,
} from 'lucide-react';
import aicpaLogo from '@/assets/aicpa-logo.webp';
import wcagLogo from '@/assets/wcag-logo.webp';
import cvaaLogo from '@/assets/cvaa-logo.webp';
import adaLogo from '@/assets/ada-logo.webp';
import gdprLogo from '@/assets/gdpr-logo.webp';

const Wordmark = () => (
  <span className="font-light">
    axess<span className="text-rose-500">player</span>
  </span>
);

const Enterprise = () => {
  const { t } = useTranslation();
  const tk = (k: string) => t(`enterprisePage.${k}`);

  const capabilities = [
    { icon: UserCheck, title: tk('cap1Title'), body: tk('cap1Body') },
    { icon: Globe, title: tk('cap2Title'), body: tk('cap2Body') },
    { icon: ShieldCheck, title: tk('cap3Title'), body: tk('cap3Body') },
    { icon: Sparkles, title: tk('cap4Title'), body: tk('cap4Body') },
    { icon: Layers, title: tk('cap5Title'), body: tk('cap5Body') },
    { icon: Archive, title: tk('cap6Title'), body: tk('cap6Body') },
  ];

  const deploySteps = [
    { icon: Upload, title: tk('step1Title'), body: tk('step1Body') },
    { icon: Settings, title: tk('step2Title'), body: tk('step2Body') },
    { icon: PlayCircle, title: tk('step3Title'), body: tk('step3Body') },
  ];

  const industryPoints = [tk('industryPoint1'), tk('industryPoint2'), tk('industryPoint3')];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none" />
        <div className="container mx-auto px-6 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge variant="outline" className="font-normal">
              <Wordmark /> {tk('badge')}
            </Badge>
            <h1 className="text-5xl md:text-7xl font-light text-foreground leading-[1.05] tracking-tight">
              {tk('heroTitle1')}
              <br />
              <span className="text-primary">{tk('heroTitle2')}</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-light leading-relaxed max-w-3xl mx-auto">
              <Trans i18nKey="enterprisePage.heroBody" components={{ wm: <Wordmark /> }} />
            </p>
            <p className="text-2xl md:text-3xl font-light text-foreground">{tk('heroTagline')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg" className="text-base">
                <Link to="/upload">
                  {tk('ctaUpload')} <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <Link to="/contact">{tk('ctaTalk')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* The shift */}
      <section className="py-24 md:py-32 border-t bg-muted/20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-sm font-medium uppercase tracking-widest text-primary">{tk('shiftEyebrow')}</h2>
            <p className="text-2xl md:text-3xl font-light text-foreground leading-snug">{tk('shiftLead')}</p>
            <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
              <Trans i18nKey="enterprisePage.shiftBody" components={{ wm: <Wordmark /> }} />
            </p>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto space-y-4">
            <h2 className="text-4xl md:text-5xl font-light text-foreground leading-tight">{tk('whatTitle')}</h2>
            <p className="text-lg text-muted-foreground font-light">{tk('whatSub')}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {capabilities.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.title} className="bg-card rounded-2xl border p-8 shadow-soft hover:shadow-elegant transition-shadow space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-light text-foreground leading-snug">{c.title}</h3>
                  <p className="text-muted-foreground font-light leading-relaxed">{c.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Industry first */}
      <section className="py-24 md:py-32 bg-primary/5 border-y">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="text-center space-y-6">
              <h2 className="text-sm font-medium uppercase tracking-widest text-primary">{tk('industryEyebrow')}</h2>
              <h3 className="text-4xl md:text-5xl font-light text-foreground leading-tight">{tk('industryTitle')}</h3>
              <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed max-w-3xl mx-auto">
                <Trans i18nKey="enterprisePage.industryBody" components={{ wm: <Wordmark /> }} />
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {industryPoints.map((line) => (
                <div key={line} className="bg-card rounded-2xl border p-6 shadow-soft">
                  <p className="text-foreground font-light leading-relaxed">{line}</p>
                </div>
              ))}
            </div>

            <p className="text-center text-2xl md:text-3xl font-light text-foreground leading-snug pt-4">{tk('industryClose')}</p>
          </div>
        </div>
      </section>

      {/* Deploy */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto space-y-4">
            <h2 className="text-4xl md:text-5xl font-light text-foreground leading-tight">{tk('deployTitle')}</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {deploySteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="relative bg-card rounded-2xl border p-8 shadow-soft space-y-4">
                  <div className="text-sm font-medium text-primary">{`Step ${i + 1}`}</div>
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-2xl font-light text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground font-light leading-relaxed">{step.body}</p>
                </div>
              );
            })}
          </div>

          <p className="text-center text-lg text-muted-foreground font-light mt-12 max-w-3xl mx-auto">{tk('deployFoot')}</p>
        </div>
      </section>

      {/* Compliance */}
      <section className="py-24 bg-muted/20 border-y">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-light text-foreground mb-4 leading-tight">{tk('complianceTitle')}</h2>
            <p className="text-lg text-muted-foreground font-light max-w-3xl mx-auto">{tk('complianceSub')}</p>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-16 max-w-5xl mx-auto">
            <img src={aicpaLogo} alt="AICPA SOC Compliance" className="h-24 md:h-28 w-auto opacity-90 hover:opacity-100 transition-opacity" />
            <img src={wcagLogo} alt="WCAG 2.0 AA Compliant" className="h-24 md:h-28 w-auto opacity-90 hover:opacity-100 transition-opacity" />
            <img src={cvaaLogo} alt="CVAA Compliant" className="h-24 md:h-28 w-auto opacity-90 hover:opacity-100 transition-opacity" />
            <img src={adaLogo} alt="ADA Compliant Website" className="h-24 md:h-28 w-auto opacity-90 hover:opacity-100 transition-opacity" />
            <img src={gdprLogo} alt="GDPR Compliant" className="h-24 md:h-28 w-auto opacity-90 hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </section>

      {/* Why now */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-sm font-medium uppercase tracking-widest text-primary">{tk('whyEyebrow')}</h2>
              <h3 className="text-4xl md:text-5xl font-light text-foreground leading-tight">{tk('whyTitle')}</h3>
            </div>
            <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
              <Trans i18nKey="enterprisePage.whyBody" components={{ wm: <Wordmark /> }} />
            </p>
            <p className="text-xl md:text-2xl font-light text-foreground leading-snug">{tk('whyClose')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg" className="text-base">
                <Link to="/upload">
                  {tk('ctaGet')} <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <Link to="/explore">{tk('ctaExplore')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <TechStack />
      <PatentClaims />
    </div>
  );
};

export default Enterprise;

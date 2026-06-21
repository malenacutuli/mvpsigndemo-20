import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';
import { TechStack } from '@/components/TechStack';
import { PatentClaims } from '@/components/PatentClaims';
import {
  Upload,
  Settings,
  PlayCircle,
  Globe,
  ShieldCheck,
  Sparkles,
  Layers,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Film,
  Radio,
  Monitor,
  Landmark,
  Megaphone,
  Lock,
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

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-3">
    <CheckCircle2 className="w-5 h-5 text-primary mt-1 shrink-0" />
    <span className="text-foreground font-light leading-relaxed">{children}</span>
  </li>
);

const Enterprise = () => {
  const whatYouGet = [
    {
      icon: Globe,
      title: 'Global Reach',
      body: 'Publish in 40+ languages from a single master asset. AI-assisted dubbing, subtitles, and localization dramatically reduce time-to-market.',
    },
    {
      icon: ShieldCheck,
      title: 'Accessibility by Default',
      body: 'Generate captions, audio description, sign language, high contrast viewing, and accessible playback controls. Meet WCAG, ADA, EAA, EN 301 549, and emerging standards without separate production workflows.',
    },
    {
      icon: Sparkles,
      title: 'New Revenue Streams',
      body: 'Turn existing content into new commercial inventory. Enable regional sponsorships, dynamic product placement, branded integrations, and localized advertising. Generate revenue from content already in your library.',
    },
    {
      icon: BarChart3,
      title: 'Audience Intelligence',
      body: 'Understand completion rates, accessibility usage, audience behavior, market performance, and engagement patterns. Learn how audiences experience content, not just what they watched.',
    },
  ];

  const steps = [
    { icon: Upload, title: 'Upload', body: 'Upload your master asset.' },
    { icon: Settings, title: 'Generate', body: 'Automatically create accessibility tracks, language versions, localized assets, and interactive experiences.' },
    { icon: CheckCircle2, title: 'Review', body: 'Human-in-the-loop approval where required.' },
    { icon: PlayCircle, title: 'Publish', body: 'Deploy to web, mobile, OTT, broadcast, or enterprise environments.' },
    { icon: BarChart3, title: 'Measure', body: 'Track engagement, accessibility adoption, audience behavior, and revenue performance in real time.' },
  ];

  const audiences = [
    { icon: Film, title: 'Studios', body: 'Reduce localization costs and expand international distribution.' },
    { icon: Radio, title: 'Broadcasters', body: 'Meet accessibility requirements and reach more viewers.' },
    { icon: Monitor, title: 'Streamers', body: 'Scale content libraries globally.' },
    { icon: Landmark, title: 'Governments & Public Institutions', body: 'Deliver accessible content for every citizen.' },
    { icon: Megaphone, title: 'Brands & Agencies', body: 'Create localized, measurable content experiences.' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none" />
        <div className="container mx-auto px-6 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-5xl md:text-7xl font-light text-foreground leading-[1.05] tracking-tight">
              Turn one story into <span className="text-primary">global reach.</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-light leading-relaxed max-w-3xl mx-auto">
              <Wordmark /> helps studios, broadcasters, streamers, publishers, governments, and enterprises transform a single production into accessible, multilingual, monetizable content at global scale.
            </p>
            <div className="text-xl md:text-2xl font-light text-foreground space-y-1">
              <p>One upload.</p>
              <p>Every language.</p>
              <p>Every accessibility format.</p>
              <p>Every market.</p>
              <p>Every audience.</p>
              <p className="text-muted-foreground pt-2">Without rebuilding content from scratch.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg" className="text-base">
                <Link to="/upload">
                  Start upload <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <Link to="/contact">Talk to enterprise sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-24 md:py-32 border-t bg-muted/20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto space-y-8 text-center">
            <h2 className="text-sm font-medium uppercase tracking-widest text-primary">The problem</h2>
            <p className="text-4xl md:text-5xl font-light text-foreground leading-tight">
              Great content is expensive to scale.
            </p>
            <ul className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed space-y-2 max-w-2xl mx-auto text-left">
              <li>Every new audience adds cost.</li>
              <li>Every language requires localization.</li>
              <li>Every accessibility requirement creates additional workflows.</li>
              <li>Every new market introduces compliance challenges.</li>
              <li>Every monetization model requires more infrastructure.</li>
            </ul>
            <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
              Most organizations solve these problems with separate vendors, disconnected tools, and manual processes. <Wordmark /> unifies them into a single platform.
            </p>
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-widest text-primary">What you get</h2>
            <p className="text-4xl md:text-5xl font-light text-foreground leading-tight">
              One story. Multiple outcomes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {whatYouGet.map((c) => {
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

      {/* Why enterprises choose */}
      <section className="py-24 md:py-32 bg-primary/5 border-y">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto space-y-10 text-center">
            <h2 className="text-sm font-medium uppercase tracking-widest text-primary">Why enterprises choose <Wordmark /></h2>
            <p className="text-4xl md:text-5xl font-light text-foreground leading-tight">
              One platform instead of five.
            </p>
            <p className="text-lg md:text-xl text-muted-foreground font-light">Most organizations manage:</p>
            <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-3 max-w-4xl mx-auto">
              {['Accessibility vendor', 'Localization vendor', 'Compliance tools', 'Analytics platforms', 'Monetization systems'].map((v) => (
                <div key={v} className="bg-card rounded-xl border p-4 text-sm font-light text-foreground">
                  {v}
                </div>
              ))}
            </div>
            <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
              <Wordmark /> consolidates them into one workflow.
            </p>
            <div className="text-2xl md:text-3xl font-light text-foreground space-y-1 pt-2">
              <p>One upload.</p>
              <p>One review process.</p>
              <p>One source of truth.</p>
            </div>
          </div>
        </div>
      </section>

      {/* The Platform - steps */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-widest text-primary">The platform</h2>
            <p className="text-4xl md:text-5xl font-light text-foreground leading-tight">
              Create once. Deploy everywhere.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="relative bg-card rounded-2xl border p-6 shadow-soft space-y-3">
                  <div className="text-sm font-medium text-primary">{`Step ${i + 1}`}</div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-light text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground font-light leading-relaxed">{step.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Accessibility as competitive advantage */}
      <section className="py-24 md:py-32 bg-muted/20 border-y">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-sm font-medium uppercase tracking-widest text-primary">Accessibility as a competitive advantage</h2>
              <p className="text-4xl md:text-5xl font-light text-foreground leading-tight">
                Accessibility should grow audiences, not create work.
              </p>
            </div>
            <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed text-center">
              Most organizations treat accessibility as a compliance obligation. We treat it as audience expansion.
            </p>
            <ul className="space-y-3 max-w-2xl mx-auto">
              <Bullet>Reaches more viewers</Bullet>
              <Bullet>Improves engagement</Bullet>
              <Bullet>Expands addressable markets</Bullet>
              <Bullet>Reduces regulatory risk</Bullet>
            </ul>
            <p className="text-center text-2xl md:text-3xl font-light text-foreground leading-snug pt-2">
              Compliance becomes a business advantage.
            </p>
          </div>
        </div>
      </section>

      {/* Enterprise Security & Trust */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-sm font-medium uppercase tracking-widest text-primary">Enterprise security and trust</h2>
              <p className="text-4xl md:text-5xl font-light text-foreground leading-tight">
                Built for regulated organizations.
              </p>
              <p className="text-lg md:text-xl text-muted-foreground font-light">
                Enterprise-ready architecture includes:
              </p>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {[
                'C2PA provenance',
                'AI disclosure workflows',
                'Consent management',
                'Audit trails',
                'GDPR compliance',
                'EU AI Act readiness',
                'Sovereign hosting options',
                'Enterprise SSO',
                'Role-based permissions',
              ].map((item) => (
                <div key={item} className="bg-card rounded-xl border p-5 flex items-start gap-3 shadow-soft">
                  <Lock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <span className="font-light text-foreground">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-xl md:text-2xl font-light text-foreground leading-snug">
              Every asset remains traceable from creation to publication.
            </p>
          </div>
        </div>
      </section>

      {/* What makes us different */}
      <section className="py-24 md:py-32 bg-primary/5 border-y">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto space-y-8 text-center">
            <h2 className="text-sm font-medium uppercase tracking-widest text-primary">What makes us different</h2>
            <p className="text-4xl md:text-5xl font-light text-foreground leading-tight">
              Most platforms distribute content. We help content scale.
            </p>
            <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
              Netflix helps audiences find stories. <Wordmark /> helps stories reach every audience.
            </p>
            <p className="text-lg md:text-xl text-muted-foreground font-light">
              From one production, organizations can unlock:
            </p>
            <ul className="space-y-3 max-w-xl mx-auto text-left">
              <Bullet>More languages</Bullet>
              <Bullet>More accessibility</Bullet>
              <Bullet>More markets</Bullet>
              <Bullet>More revenue</Bullet>
              <Bullet>More audience insight</Bullet>
            </ul>
            <p className="text-xl md:text-2xl font-light text-foreground leading-snug pt-2">
              Without multiplying operational complexity.
            </p>
          </div>
        </div>
      </section>

      {/* Who we serve */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-widest text-primary">Who we serve</h2>
            <p className="text-4xl md:text-5xl font-light text-foreground leading-tight">
              Built for every kind of storyteller.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {audiences.map((a) => {
              const Icon = a.icon;
              return (
                <div key={a.title} className="bg-card rounded-2xl border p-6 shadow-soft space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-light text-foreground">{a.title}</h3>
                  <p className="text-muted-foreground font-light leading-relaxed">{a.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why now */}
      <section className="py-24 md:py-32 bg-muted/20 border-y">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto space-y-8 text-center">
            <h2 className="text-sm font-medium uppercase tracking-widest text-primary">Why now</h2>
            <ul className="space-y-3 text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
              <li>Accessibility regulations are expanding.</li>
              <li>Global audiences expect content in their language.</li>
              <li>AI is transforming production economics.</li>
              <li>Media companies are under pressure to do more with fewer resources.</li>
            </ul>
            <p className="text-2xl md:text-3xl font-light text-foreground leading-snug pt-4">
              The organizations that win will not be the ones producing the most content. They will be the ones that can scale content the fastest.
            </p>
            <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
              <Wordmark /> is the infrastructure that makes that possible.
            </p>
          </div>
        </div>
      </section>

      {/* Compliance logos */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-light text-foreground mb-4 leading-tight">Compliance, built in.</h2>
            <p className="text-lg text-muted-foreground font-light max-w-3xl mx-auto">
              Aligned with global accessibility, privacy, and security standards.
            </p>
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

      {/* Final CTA */}
      <section className="py-24 md:py-32 bg-primary/5 border-t">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-6xl font-light text-foreground leading-tight">
              Ready to scale your content globally?
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
              Book a demo and see how one production can reach every audience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <Button asChild size="lg" className="text-base">
                <Link to="/contact">
                  Schedule demo <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <Link to="/contact">Contact enterprise sales</Link>
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

import { Link } from 'react-router-dom';
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

type Status = 'live' | 'roadmap';


const capabilities: Array<{
  icon: typeof Globe;
  title: string;
  status: Status;
  body: string;
}> = [
  {
    icon: UserCheck,
    title: 'Accessibility, done best and built in',
    status: 'live',
    body:
      "Captions with Intention that carry tone and character, emotive audio descriptions, sign language, and high-contrast inclusive viewing tools, generated automatically and on by default. Your stories do not just reach more people. They move them. WCAG 2.1 AA, EAA, ADA, and EN 301 549 met as a byproduct, not a burden.",
  },
  {
    icon: Globe,
    title: 'Every language, every market',
    status: 'live',
    body:
      'Performance-aware dubbing and localized captions in 40+ languages from one source, so a single production opens every market at once.',
  },
  {
    icon: ShieldCheck,
    title: 'Trust for the AI era',
    status: 'live',
    body:
      'Every synthetic or adapted asset carries a consent record, C2PA provenance, and a clear AI label, with sovereign EU and Swiss data residency. This is the layer the EU AI Act now requires and that almost no one has. With Axessplayer, the thing that is a legal blocker for everyone else is a feature you already own.',
  },
  {
    icon: Sparkles,
    title: 'One story, adapted to the viewer',
    status: 'roadmap',
    body:
      'The same production can re-cut itself by pace, point of view, and intensity, so the experience fits the person watching, not the average of everyone. Personalization that lifts completion, measured, never manipulative.',
  },
  {
    icon: Layers,
    title: 'New revenue, not just new reach',
    status: 'roadmap',
    body:
      "Generation-time brand integration places products inside the story with the scene's real lighting and geometry, not a banner bolted on top. A new revenue line for your content, with brand safety and disclosure built in.",
  },
  {
    icon: Archive,
    title: 'Turn dead footage into new inventory',
    status: 'roadmap',
    body:
      'Old, horizontal, regional, or shelved footage becomes vertical, localized, accessible, brand-ready episodes, with rights and consent cleared before anything publishes. The archive you already paid for becomes the catalog you monetize next.',
  },
];

const deploySteps = [
  {
    icon: Upload,
    title: 'Upload once',
    body: 'Drop in a master. Generating one from a prompt is on the roadmap.',
  },
  {
    icon: Settings,
    title: 'Set it once',
    body: 'Choose your languages, accessibility tracks (on by default), and monetization. We compute the work and the cost before you commit.',
  },
  {
    icon: PlayCircle,
    title: 'Process and publish',
    body: 'Watch every track generate live, review what needs a human eye, and publish everywhere, mobile and web, with compliance reporting and real-time analytics.',
  },
];

const Enterprise = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none" />
        <div className="container mx-auto px-6 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge variant="outline" className="font-normal">
              <Wordmark /> Enterprise
            </Badge>
            <h1 className="text-5xl md:text-7xl font-light text-foreground leading-[1.05] tracking-tight">
              The world's first
              <br />
              <span className="text-primary">adaptive video platform.</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-light leading-relaxed max-w-3xl mx-auto">
              One story, reshaped for every viewer, every language, every audience, and every screen.
              From a single master, <Wordmark /> automatically produces vertical cuts, dubbing in 40+
              languages, full accessibility, and personalized versions, every one signed, consented,
              and compliant by the time it ships.
            </p>
            <p className="text-2xl md:text-3xl font-light text-foreground">
              Build something better. For everyone. Everywhere.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg" className="text-base">
                <Link to="/upload">
                  Start your upload <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <Link to="/contact">Talk to our team</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* The shift */}
      <section className="py-24 md:py-32 border-t bg-muted/20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-sm font-medium uppercase tracking-widest text-primary">The shift</h2>
            <p className="text-2xl md:text-3xl font-light text-foreground leading-snug">
              Most platforms make you choose: reach more people, or move faster, or stay compliant,
              or open new revenue. You do one, then bolt on the rest.
            </p>
            <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
              <Wordmark /> collapses all of it into a single upload. Accessibility is not a project
              you run after the fact. Localization is not a vendor you chase. Compliance is not a
              cost center. They are simply how your video works, from the first frame.
            </p>
          </div>
        </div>
      </section>

      {/* What you get from one master */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto space-y-4">
            <h2 className="text-4xl md:text-5xl font-light text-foreground leading-tight">
              What you get from one master
            </h2>
            <p className="text-lg text-muted-foreground font-light">
              Six capabilities, one pipeline, zero rework.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {capabilities.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.title}
                  className="bg-card rounded-2xl border p-8 shadow-soft hover:shadow-elegant transition-shadow space-y-4"
                >
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
              <h2 className="text-sm font-medium uppercase tracking-widest text-primary">Industry first</h2>
              <h3 className="text-4xl md:text-5xl font-light text-foreground leading-tight">
                The adaptive content engine
              </h3>
              <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed max-w-3xl mx-auto">
                Where competitors ship point solutions, <Wordmark /> is end-to-end automation on one
                substrate. Every output, a caption, a dub, an accessible track, an alternate cut, a
                brand integration, is a variant of the same story, measured the same way, signed the
                same way, governed the same way. That is the difference between a feature and a
                platform.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                'One automated pipeline from upload to published, accessible, multilingual, monetizable title.',
                'Consent, provenance, and AI labeling on every asset, by construction.',
                'Compliance auditing and reporting, a white-label embeddable player, and enterprise SSO and user management.',
              ].map((line) => (
                <div key={line} className="bg-card rounded-2xl border p-6 shadow-soft">
                  <p className="text-foreground font-light leading-relaxed">{line}</p>
                </div>
              ))}
            </div>

            <p className="text-center text-2xl md:text-3xl font-light text-foreground leading-snug pt-4">
              We do not just enhance video. We make one production reach, and move, the whole world.
            </p>
          </div>
        </div>
      </section>

      {/* Deploy in minutes */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto space-y-4">
            <h2 className="text-4xl md:text-5xl font-light text-foreground leading-tight">
              Deploy in minutes, not months
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {deploySteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="relative bg-card rounded-2xl border p-8 shadow-soft space-y-4">
                  <div className="text-sm font-medium text-primary">Step {i + 1}</div>
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-2xl font-light text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground font-light leading-relaxed">{step.body}</p>
                </div>
              );
            })}
          </div>

          <p className="text-center text-lg text-muted-foreground font-light mt-12 max-w-3xl mx-auto">
            Zero-code integration. User-toggleable features. Enterprise-grade infrastructure built to
            serve millions.
          </p>
        </div>
      </section>

      {/* Compliance logos */}
      <section className="py-24 bg-muted/20 border-y">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-light text-foreground mb-4 leading-tight">
              Turn compliance from a cost center into a competitive advantage
            </h2>
            <p className="text-lg text-muted-foreground font-light max-w-3xl mx-auto">
              Meet global accessibility and security standards with confidence.
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

      {/* Why now */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-sm font-medium uppercase tracking-widest text-primary">Why now</h2>
              <h3 className="text-4xl md:text-5xl font-light text-foreground leading-tight">
                The market is rewarding whoever can do all of this at once.
              </h3>
            </div>
            <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
              Vertical short drama is the fastest-growing segment in mobile, AI is collapsing
              production cost by up to ten times, and accessibility is now law, with EAA enforcement
              live since June 2025 and the EU AI Act tightening through 2026. The market is
              rewarding whoever can produce more, in more languages, for more audiences, faster and
              cheaper, while staying compliant and trustworthy. That is precisely, and only, what{' '}
              <Wordmark /> does end to end.
            </p>
            <p className="text-xl md:text-2xl font-light text-foreground leading-snug">
              Turn compliance from a cost center into a competitive advantage. Reach 100 percent of
              your audience, in every language, across every standard, and open new revenue while
              you do it.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg" className="text-base">
                <Link to="/upload">
                  Get started <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <Link to="/explore">Explore the platform</Link>
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

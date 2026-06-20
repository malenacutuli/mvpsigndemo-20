import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation } from '@/components/Navigation';
import {
  Upload,
  Settings,
  PlayCircle,
  Sparkles,
  Globe,
  Wallet,
  Handshake,
  ShieldCheck,
  BarChart3,
  ArrowRight,
} from 'lucide-react';

const Wordmark = () => (
  <span className="font-light">
    axess<span className="text-rose-500">player</span>
  </span>
);

const Creators = () => {
  const { t } = useTranslation();
  const tk = (k: string) => t(`creatorsPage.${k}`);

  const RoadmapTag = () => (
    <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300 ml-2 align-middle">
      {tk('comingSoon')}
    </span>
  );

  const benefits = [
    {
      icon: Sparkles,
      title: tk('b1Title'),
      roadmap: false,
      body: (
        <>
          {tk('b1Part1')}<RoadmapTag />{tk('b1Part2')}<RoadmapTag />
        </>
      ),
    },
    { icon: Globe, title: tk('b2Title'), roadmap: false, body: tk('b2Body') },
    { icon: Wallet, title: tk('b3Title'), roadmap: false, body: tk('b3Body') },
    { icon: Handshake, title: tk('b4Title'), roadmap: true, body: tk('b4Body') },
    { icon: ShieldCheck, title: tk('b5Title'), roadmap: false, body: tk('b5Body') },
    { icon: BarChart3, title: tk('b6Title'), roadmap: false, body: tk('b6Body') },
  ];

  const steps = [
    { icon: Upload, title: tk('s1Title'), body: tk('s1Body') },
    { icon: Settings, title: tk('s2Title'), body: tk('s2Body') },
    { icon: PlayCircle, title: tk('s3Title'), body: tk('s3Body') },
    { icon: Globe, title: tk('s4Title'), body: tk('s4Body') },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 via-background to-background pointer-events-none" />
        <div className="container mx-auto px-6 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge variant="outline" className="font-normal">
              <Wordmark /> {tk('badge')}
            </Badge>
            <h1 className="text-5xl md:text-7xl font-light text-foreground leading-[1.05] tracking-tight">
              {tk('heroTitle1')}
              <br />
              <span className="text-rose-500">{tk('heroTitle2')}</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-light leading-relaxed max-w-3xl mx-auto">
              <Trans i18nKey="creatorsPage.heroBody" components={{ wm: <Wordmark /> }} />
            </p>
            <p className="text-2xl md:text-3xl font-light text-foreground">{tk('heroTagline')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg" className="text-base">
                <Link to="/upload">
                  {tk('ctaStart')} <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <Link to="/contact">{tk('ctaJoin')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* The promise */}
      <section className="py-24 md:py-32 border-t bg-muted/20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-sm font-medium uppercase tracking-widest text-rose-500">{tk('promiseEyebrow')}</h2>
            <p className="text-2xl md:text-3xl font-light text-foreground leading-snug">{tk('promiseLead')}</p>
            <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
              <Trans i18nKey="creatorsPage.promiseBody" components={{ wm: <Wordmark /> }} />
            </p>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto space-y-4">
            <h2 className="text-4xl md:text-5xl font-light text-foreground leading-tight">{tk('whatTitle')}</h2>
            <p className="text-lg text-muted-foreground font-light">
              <Trans i18nKey="creatorsPage.whatSub" components={{ wm: <Wordmark /> }} />
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="bg-card rounded-2xl border p-8 shadow-soft hover:shadow-elegant transition-shadow space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-rose-500" />
                  </div>
                  <h3 className="text-2xl font-light text-foreground leading-snug">
                    {b.title}
                    {b.roadmap && <RoadmapTag />}
                  </h3>
                  <p className="text-muted-foreground font-light leading-relaxed">{b.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 md:py-32 bg-muted/20 border-y">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto space-y-4">
            <h2 className="text-4xl md:text-5xl font-light text-foreground leading-tight">{tk('howTitle')}</h2>
            <p className="text-lg text-muted-foreground font-light">{tk('howSub')}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="bg-card rounded-2xl border p-6 shadow-soft space-y-4">
                  <div className="text-sm font-medium text-rose-500">{`${tk('step')} ${i + 1}`}</div>
                  <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-rose-500" />
                  </div>
                  <h3 className="text-xl font-light text-foreground">{s.title}</h3>
                  <p className="text-muted-foreground font-light leading-relaxed">{s.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why now */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-sm font-medium uppercase tracking-widest text-rose-500">{tk('whyEyebrow')}</h2>
              <h3 className="text-4xl md:text-5xl font-light text-foreground leading-tight">{tk('whyTitle')}</h3>
            </div>
            <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
              <Trans i18nKey="creatorsPage.whyBody" components={{ wm: <Wordmark /> }} />
            </p>
            <p className="text-xl md:text-2xl font-light text-foreground leading-snug text-center">{tk('whyClose')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg" className="text-base">
                <Link to="/upload">
                  {tk('ctaStart')} <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <Link to="/contact">{tk('ctaEarn')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Creators;

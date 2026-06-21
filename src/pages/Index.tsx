import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navigation } from '@/components/Navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { EarlyAccessForm } from '@/components/EarlyAccessForm';
import { CreatorsForm } from '@/components/CreatorsForm';
import { TalentForm } from '@/components/TalentForm';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, Globe2, Sparkles, Film, Languages, Gift, ShoppingBag, Repeat, Camera, Cpu, Wand2, Layers, Brain, ShieldCheck, MapPin } from 'lucide-react';
import { PartnersStripe } from '@/components/PartnersStripe';
import logoWhite from '@/assets/axessplayer-logo-white.png.asset.json';
import heroPhone from '@/assets/axessplayer-hero-phone.png.asset.json';
import rewardsScreen from '@/assets/axessplayer-rewards-screen.png.asset.json';
import postersImage from '@/assets/axessplayer-posters.png.asset.json';
import appGridImage from '@/assets/axessplayer-app-grid.png.asset.json';
import dppMx from '@/assets/dpp-mx-topochico.png.asset.json';
import dppUs from '@/assets/dpp-us-cocacola.png.asset.json';
import dppAeCosmo from '@/assets/dpp-ae-cosmo.png.asset.json';
import dppAeModest from '@/assets/dpp-ae-modest.png.asset.json';
import dppAeNiqab from '@/assets/dpp-ae-niqab.png.asset.json';

const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`font-mono text-[11px] sm:text-xs uppercase tracking-[0.22em] text-axp-rose ${className}`}>
    {children}
  </p>
);

const SectionHeading: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h2 className={`font-display text-4xl sm:text-5xl md:text-6xl font-light tracking-tight text-axp-ink leading-[1.05] ${className}`}>
    {children}
  </h2>
);

const DemoHome: React.FC = () => {
  const { theme, getPath } = useTheme();
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <section className="container mx-auto px-6 py-24 text-center">
        <p className="text-sm text-muted-foreground uppercase tracking-wider mb-6 font-light">{theme.tagline}</p>
        <h1 className="text-4xl md:text-6xl font-light leading-tight mb-8 max-w-4xl mx-auto">{theme.heroTitle}</h1>
        <p className="text-lg md:text-xl text-muted-foreground font-light max-w-2xl mx-auto mb-10">{theme.heroSubtitle}</p>
        <Button asChild size="lg" className="px-10 py-6 rounded-full">
          <Link to={getPath('/auth')}>{theme.ctaText}</Link>
        </Button>
      </section>
    </div>
  );
};

const Home: React.FC = () => {
  const { isDemo } = useTheme();
  const { t } = useTranslation();
  if (isDemo) return <DemoHome />;

  return (
    <div className="min-h-screen bg-axp-warm-white text-axp-ink font-body antialiased">
      <Navigation />

      <section className="bg-axp-warm-white">
        <div className="container mx-auto px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 lg:pt-32 lg:pb-36">
          <div className="max-w-5xl mx-auto text-center">
            <Eyebrow>{t('home.eyebrow.adaptiveCinema')}</Eyebrow>
            <h1 className="mt-6 font-display font-light tracking-tight text-axp-ink text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.98]">
              {t('home.hero.title1')} <span className="text-axp-rose">{t('home.hero.title2')}</span>
            </h1>
            <p className="mt-8 text-lg sm:text-xl md:text-2xl text-axp-ink/70 font-light max-w-3xl mx-auto leading-relaxed">
              {t('home.hero.description')}
            </p>

            <div className="mt-10 max-w-xl mx-auto">
              <EarlyAccessForm variant="light" source="home-hero" />
            </div>

          </div>

          <div className="mt-16 grid lg:grid-cols-12 gap-6 max-w-6xl mx-auto">
            <div className="lg:col-span-5 rounded-3xl overflow-hidden border border-axp-line bg-white">
              <img src={heroPhone.url} alt="Axessplayer interactive story screen" className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-6">
              <div className="rounded-3xl overflow-hidden border border-axp-line bg-white">
                <img src={rewardsScreen.url} alt="Axessplayer rewards and credits interface" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="rounded-3xl overflow-hidden border border-axp-line bg-white">
                <img src={appGridImage.url} alt="Axessplayer content discovery screens" className="w-full h-full object-cover" loading="lazy" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <PartnersStripe />


      {/* The Problem */}
      <section className="bg-axp-ink text-white">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-4xl mx-auto">
            <Eyebrow>The problem</Eyebrow>
            <h2 className="mt-6 font-display font-light text-4xl sm:text-5xl md:text-6xl leading-[1.05] text-white">
              Great stories <span className="text-axp-rose">don't scale.</span>
            </h2>
            <p className="mt-8 text-lg md:text-xl text-white/70 font-light leading-relaxed">
              A creator makes one story. Then comes the expensive part.
            </p>
            <ul className="mt-8 grid sm:grid-cols-2 gap-3 text-white/80 font-light">
              {['Localization', 'Accessibility', 'Distribution', 'Regional adaptation', 'Brand partnerships', 'Audience growth'].map((x) => (
                <li key={x} className="rounded-2xl border border-white/15 bg-white/[0.04] px-5 py-4">{x}</li>
              ))}
            </ul>
            <p className="mt-10 text-lg md:text-xl text-white/70 font-light leading-relaxed">
              Every new audience adds cost. Every new market adds complexity. Most stories never reach their full audience because scaling them is too expensive.
            </p>
          </div>
        </div>
      </section>

      {/* The Solution */}
      <section className="bg-axp-warm-white">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-4xl">
            <Eyebrow>The solution</Eyebrow>
            <SectionHeading className="mt-6">
              Turn one story into <span className="text-axp-rose">many experiences.</span>
            </SectionHeading>
            <p className="mt-8 text-lg md:text-xl text-axp-ink/70 font-light leading-relaxed max-w-3xl">
              Axessplayer helps creators, studios, and brands expand a single production across languages, accessibility needs, markets, interactive experiences, and brand partnerships, without recreating content from scratch.
            </p>
          </div>

          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { icon: Globe2, label: 'Languages' },
              { icon: ShieldCheck, label: 'Accessibility needs' },
              { icon: MapPin, label: 'Markets' },
              { icon: Sparkles, label: 'Interactive experiences' },
              { icon: ShoppingBag, label: 'Brand partnerships' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-3xl border border-axp-line bg-white p-6">
                <Icon className="w-6 h-6 text-axp-rose" />
                <p className="mt-4 font-display text-lg font-light text-axp-ink">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Three audiences: Creators, Studios, Brands */}
      <section className="bg-white border-y border-axp-line">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                eyebrow: 'For creators',
                title: 'Create once. Reach everywhere.',
                body: 'Transform one production into multiple languages, accessibility-ready versions, interactive story paths, and global distribution assets.',
                kicker: 'More audience. More revenue. Less production overhead.',
                items: ['Multiple languages', 'Accessibility-ready versions', 'Interactive story paths', 'Global distribution assets'],
              },
              {
                eyebrow: 'For studios',
                title: 'Make every production global.',
                body: 'One master becomes dubbed, captioned, audio described, sign language enabled, and market localized.',
                kicker: 'Reduce localization costs. Increase audience reach. Meet accessibility requirements from day one.',
                items: ['Dubbed', 'Captioned', 'Audio described', 'Sign language enabled', 'Market localized'],
              },
              {
                eyebrow: 'For brands',
                title: 'Product placement becomes measurable.',
                body: 'The same story can support different products, different regions, and different campaigns, without interrupting the viewer experience.',
                kicker: 'One production. Multiple markets. Real performance data.',
                items: ['Different products', 'Different regions', 'Different campaigns'],
              },
            ].map((col) => (
              <div key={col.eyebrow} className="rounded-3xl border border-axp-line bg-axp-warm-white p-8 lg:p-10">
                <Eyebrow>{col.eyebrow}</Eyebrow>
                <h3 className="mt-5 font-display text-2xl lg:text-3xl font-light text-axp-ink leading-snug">{col.title}</h3>
                <p className="mt-4 text-axp-ink/70 font-light leading-relaxed">{col.body}</p>
                <ul className="mt-6 space-y-2">
                  {col.items.map((it) => (
                    <li key={it} className="flex items-start gap-2 text-axp-ink font-light">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-axp-rose shrink-0" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 font-display text-lg font-light text-axp-ink/80 italic border-t border-axp-line pt-5">
                  {col.kicker}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-axp-warm-white">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-4xl">
            <Eyebrow>How it works</Eyebrow>
            <SectionHeading className="mt-6">
              Human storytelling. <span className="text-axp-rose">AI-powered scale.</span>
            </SectionHeading>
          </div>

          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { n: '01', icon: Camera, title: 'Create', body: 'Film your story once. Human creativity stays at the center.' },
              { n: '02', icon: Wand2, title: 'Expand', body: 'Generate language versions, accessibility layers, interactive experiences, and market adaptations from a single master production.' },
              { n: '03', icon: Brain, title: 'Measure', body: 'Understand completion, engagement, audience behavior, accessibility usage, and market performance.' },
              { n: '04', icon: Cpu, title: 'Improve', body: 'Every interaction helps improve future experiences. More reach. More engagement. More revenue.' },
            ].map(({ n, icon: Icon, title, body }) => (
              <div key={n} className="rounded-3xl border border-axp-line bg-white p-8">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-axp-ink/40">{n}</span>
                  <Icon className="w-6 h-6 text-axp-rose" />
                </div>
                <h3 className="mt-6 font-display text-2xl font-light text-axp-ink">{title}</h3>
                <p className="mt-3 text-axp-ink/65 font-light leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why now */}
      <section className="bg-axp-ink text-white">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-4xl">
            <Eyebrow>Why now</Eyebrow>
            <h2 className="mt-6 font-display font-light text-4xl sm:text-5xl md:text-6xl leading-[1.05] text-white">
              Streaming optimized discovery. <span className="text-axp-rose">We optimize the story.</span>
            </h2>
            <p className="mt-8 text-lg md:text-xl text-white/70 font-light leading-relaxed">
              Netflix helped people find stories. TikTok helped stories get discovered. Axessplayer helps stories reach more audiences.
            </p>
            <p className="mt-6 text-xl md:text-2xl text-white font-light leading-snug">
              The next generation of entertainment isn't more content. It's content that scales.
            </p>
          </div>
        </div>
      </section>

      {/* What makes us different */}
      <section className="bg-axp-warm-white">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-4xl">
            <Eyebrow>What makes us different</Eyebrow>
            <SectionHeading className="mt-6">Built for stories that scale.</SectionHeading>
          </div>

          <div className="mt-16 grid md:grid-cols-2 gap-6 lg:gap-8">
            {[
              { icon: Sparkles, title: 'Interactive storytelling expertise', body: 'Built by the team that invented interactive entertainment.' },
              { icon: ShieldCheck, title: 'Accessibility by design', body: 'Accessibility is not an add-on. It is part of the production pipeline.' },
              { icon: Languages, title: 'AI localization', body: 'One production becomes every language and every market.' },
              { icon: Brain, title: 'Audience intelligence', body: 'We learn how audiences experience stories, not just what they watch.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-3xl border border-axp-line bg-white p-8 lg:p-10">
                <Icon className="w-7 h-7 text-axp-rose" />
                <h3 className="mt-6 font-display text-2xl lg:text-3xl font-light text-axp-ink leading-snug">{title}</h3>
                <p className="mt-4 text-axp-ink/65 font-light leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Vision */}
      <section className="bg-white border-y border-axp-line">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-4xl mx-auto text-center">
            <Eyebrow>The vision</Eyebrow>
            <SectionHeading className="mt-6">
              Every story should reach <span className="text-axp-rose">its full audience.</span>
            </SectionHeading>

            <div className="mt-14 grid sm:grid-cols-2 gap-6 text-left">
              <div className="rounded-3xl border border-axp-line bg-axp-warm-white p-8">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-axp-ink/55">Today</p>
                <p className="mt-4 font-display text-2xl font-light text-axp-ink">One story.</p>
                <p className="font-display text-2xl font-light text-axp-ink">One version.</p>
              </div>
              <div className="rounded-3xl border border-axp-ink bg-axp-ink p-8 text-white">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-axp-rose">Tomorrow</p>
                <p className="mt-4 font-display text-2xl font-light">One story.</p>
                <p className="font-display text-2xl font-light text-axp-rose">Many experiences.</p>
              </div>
            </div>

            <p className="mt-12 text-lg md:text-xl text-axp-ink/70 font-light leading-relaxed">
              Axessplayer is building the infrastructure that makes storytelling scalable.
            </p>
          </div>
        </div>
      </section>



      <section className="bg-axp-ink text-white">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-3xl mx-auto text-center">
            <Eyebrow>{t('home.talent.eyebrow')}</Eyebrow>
            <h2 className="mt-6 font-display font-light text-4xl sm:text-5xl md:text-6xl leading-[1.05] text-white">
              {t('home.talent.title1')} <span className="text-axp-rose">{t('home.talent.title2')}</span>
            </h2>
            <p className="mt-8 text-lg text-white/70 font-light leading-relaxed">
              {t('home.talent.body')}
            </p>
            <div className="mt-8">
              <Link to="/talent" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.22em] text-axp-rose hover:text-white transition-colors">
                See how it works <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="mt-12 rounded-3xl bg-white p-6 sm:p-10 max-w-3xl mx-auto">
            <TalentForm />
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-axp-line">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-3xl mx-auto text-center">
            <Eyebrow>{t('home.creators.eyebrow')}</Eyebrow>
            <SectionHeading className="mt-6">
              {t('home.creators.title1')} <span className="text-axp-rose">{t('home.creators.title2')}</span>
            </SectionHeading>
            <p className="mt-8 text-lg text-axp-ink/70 font-light leading-relaxed">
              {t('home.creators.body')}
            </p>
          </div>
          <div className="mt-12">
            <CreatorsForm />
          </div>
        </div>
      </section>

      <section className="bg-axp-ink text-white">
        <div className="container mx-auto px-6 py-28 lg:py-36 text-center">
          <Eyebrow className="!text-axp-rose">Final</Eyebrow>
          <SectionHeading className="!text-white max-w-4xl mx-auto mt-6">
            Ready to <span className="text-axp-rose">scale your story?</span>
          </SectionHeading>
          <p className="mt-6 text-lg text-white/70 font-light max-w-2xl mx-auto">
            Whether you're a creator, studio, broadcaster, platform, or brand, Axessplayer helps you reach every audience.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="rounded-full px-8 h-12 bg-axp-rose hover:bg-axp-rose/90 text-white">
              <Link to="/contact">Book a demo <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-8 h-12 border-white/30 text-white hover:bg-white/10">
              <Link to="/contact">Talk to enterprise</Link>
            </Button>
          </div>
          <div className="mt-12">
            <EarlyAccessForm variant="dark" source="home-final" microcopy="Join early access. No spam, one email when your access is ready." />
          </div>
        </div>
      </section>


      <footer className="bg-axp-ink text-white border-t border-white/10">
        <div className="container mx-auto px-6 py-16">
          <div className="grid md:grid-cols-6 gap-10">
            <div className="md:col-span-2">
              <img src={logoWhite.url} alt="Axessplayer" className="h-8 w-auto" />
              <p className="mt-5 text-white/55 font-body text-sm max-w-xs">{t('home.footer.by')}</p>
            </div>
            {[
              { h: t('home.footer.platform'), items: [[t('home.footer.howItWorks'), '/'], [t('home.footer.accessibility'), '/accessibility-statement'], [t('home.footer.forBrands'), '/enterprise'], [t('home.footer.demo'), '/explore']] },
              { h: t('home.footer.enterprise'), items: [[t('home.footer.overview'), '/enterprise'], [t('home.footer.pricing'), '/pricing'], [t('home.footer.bookDemo'), '/contact']] },
              { h: t('home.footer.company'), items: [[t('home.footer.talent'), '/talent'], [t('home.footer.contact'), '/contact']] },
              { h: t('home.footer.legal'), items: [[t('home.footer.privacy'), '/privacy-policy'], [t('home.footer.terms'), '/terms'], [t('home.footer.accessibilityStatement'), '/accessibility-statement']] },
            ].map((col, i) => (
              <div key={i}>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">{col.h}</p>
                <ul className="mt-4 space-y-2">
                  {col.items.map(([label, href]) => (
                    <li key={label}>
                      <Link to={href} className="text-white/80 hover:text-white font-body text-sm">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-14 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between gap-4 text-white/50 text-sm font-body">
            <p>{t('home.footer.tagline')}</p>
            <p>{t('home.footer.copyright', { year: new Date().getFullYear() })}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;

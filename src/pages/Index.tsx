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
            <Eyebrow>{t('home.newSections.problem.eyebrow')}</Eyebrow>
            <h2 className="mt-6 font-display font-light text-4xl sm:text-5xl md:text-6xl leading-[1.05] text-white">
              {t('home.newSections.problem.title1')} <span className="text-axp-rose">{t('home.newSections.problem.titleAccent')}</span>
            </h2>
            <p className="mt-8 text-lg md:text-xl text-white/70 font-light leading-relaxed">
              {t('home.newSections.problem.lead')}
            </p>
            <ul className="mt-8 grid sm:grid-cols-2 gap-3 text-white/80 font-light">
              {(t('home.newSections.problem.items', { returnObjects: true }) as string[]).map((x) => (
                <li key={x} className="rounded-2xl border border-white/15 bg-white/[0.04] px-5 py-4">{x}</li>
              ))}
            </ul>
            <p className="mt-10 text-lg md:text-xl text-white/70 font-light leading-relaxed">
              {t('home.newSections.problem.closing')}
            </p>
          </div>
        </div>
      </section>

      {/* The Solution */}
      <section className="bg-axp-warm-white">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-4xl">
            <Eyebrow>{t('home.newSections.solution.eyebrow')}</Eyebrow>
            <SectionHeading className="mt-6">
              {t('home.newSections.solution.title1')} <span className="text-axp-rose">{t('home.newSections.solution.titleAccent')}</span>
            </SectionHeading>
            <p className="mt-8 text-lg md:text-xl text-axp-ink/70 font-light leading-relaxed max-w-3xl">
              {t('home.newSections.solution.lead')}
            </p>
          </div>

          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[Globe2, ShieldCheck, MapPin, Sparkles, ShoppingBag].map((Icon, i) => {
              const label = (t('home.newSections.solution.pillars', { returnObjects: true }) as string[])[i];
              return (
                <div key={label} className="rounded-3xl border border-axp-line bg-white p-6">
                  <Icon className="w-6 h-6 text-axp-rose" />
                  <p className="mt-4 font-display text-lg font-light text-axp-ink">{label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Three audiences: Creators, Studios, Brands */}
      <section className="bg-white border-y border-axp-line">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {(['creators','studios','brands'] as const).map((key) => {
              const col = t(`home.newSections.audiences.${key}`, { returnObjects: true }) as { eyebrow: string; title: string; body: string; kicker: string; items: string[] };
              return (
                <div key={key} className="rounded-3xl border border-axp-line bg-axp-warm-white p-8 lg:p-10">
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
              );
            })}
          </div>
        </div>
      </section>

      {/* Brand Integration / Dynamic Product Placement */}
      <section className="bg-white border-y border-axp-line">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-4xl">
            <Eyebrow>{t('home.dpp.eyebrow')}</Eyebrow>
            <SectionHeading className="mt-6">
              {t('home.dpp.title1')} <span className="text-axp-rose">{t('home.dpp.titleAccent')}</span> {t('home.dpp.title2')}
            </SectionHeading>
            <p className="mt-8 text-lg md:text-xl text-axp-ink/70 font-light max-w-3xl leading-relaxed">
              {t('home.dpp.body')}
            </p>
          </div>

          <div className="mt-16">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-axp-ink/55">{t('home.dpp.byMarket')}</p>
            <div className="mt-6 grid md:grid-cols-3 gap-6">
              {[
                { src: dppMx.url, region: 'MX', brand: 'Topo Chico' },
                { src: dppUs.url, region: 'US', brand: 'Coca-Cola' },
                { src: dppAeCosmo.url, region: 'AE', brand: 'Masafi' },
              ].map(({ src, region, brand }) => (
                <figure key={brand} className="rounded-3xl overflow-hidden border border-axp-line bg-axp-ink">
                  <img src={src} alt={`${brand} placement, ${region} market`} className="w-full aspect-video object-cover" loading="lazy" />
                  <figcaption className="p-5 bg-white">
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-axp-ink/55">{region}</p>
                    <p className="mt-1 font-display text-xl font-light text-axp-ink">{brand}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          <div className="mt-16">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-axp-ink/55">{t('home.dpp.byAudience')}</p>
            <div className="mt-6 grid md:grid-cols-3 gap-6">
              {[
                { src: dppAeCosmo.url, key: 'cosmo' },
                { src: dppAeModest.url, key: 'modest' },
                { src: dppAeNiqab.url, key: 'conservative' },
              ].map(({ src, key }) => (
                <figure key={key} className="rounded-3xl overflow-hidden border border-axp-line bg-axp-ink">
                  <img src={src} alt={t(`home.dpp.audience.${key}`)} className="w-full aspect-video object-cover" loading="lazy" />
                  <figcaption className="p-5 bg-white">
                    <p className="font-display text-xl font-light text-axp-ink">{t(`home.dpp.audience.${key}`)}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          <div className="mt-12 rounded-3xl bg-axp-warm-white border border-axp-line p-8 lg:p-10 max-w-4xl">
            <p className="font-display text-2xl lg:text-3xl font-light text-axp-ink leading-snug">
              {t('home.dpp.stat')}
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-axp-ink/55">{t('home.dpp.source')}</p>
          </div>
        </div>
      </section>

      {/* Interactivity */}
      <section className="bg-axp-ink text-white">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-4xl">
            <Eyebrow>{t('home.pipeline.eyebrow')}</Eyebrow>
            <h2 className="mt-6 font-display font-light text-4xl sm:text-5xl md:text-6xl leading-[1.05] text-white">
              {t('home.pipeline.title1')} <span className="text-axp-rose">{t('home.pipeline.title2')}</span>
            </h2>
            <p className="mt-8 text-lg md:text-xl text-white/70 font-light max-w-3xl leading-relaxed">
              {t('home.pipeline.body')}
            </p>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              { key: 'a', icon: Camera },
              { key: 'b', icon: Wand2 },
              { key: 'c', icon: Cpu },
            ].map(({ key, icon: Icon }) => (
              <div key={key} className="rounded-3xl p-8 lg:p-10 border border-white/15 bg-white/[0.04]">
                <Icon className="w-7 h-7 text-axp-rose" />
                <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">{t(`home.pipeline.tiers.${key}.tag`)}</p>
                <h3 className="mt-3 font-display text-3xl font-light text-white">{t(`home.pipeline.tiers.${key}.title`)}</h3>
                <p className="mt-4 font-body leading-relaxed text-white/70">{t(`home.pipeline.tiers.${key}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Accessibility */}
      <section className="bg-axp-warm-white">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-4xl">
            <Eyebrow>{t('home.eyebrow.accessible')}</Eyebrow>
            <SectionHeading className="mt-6">
              {t('home.accessible.title1')} <span className="text-axp-ink/55">{t('home.accessible.title2')}</span>
            </SectionHeading>
            <p className="mt-8 text-lg md:text-xl text-axp-ink/70 font-light leading-relaxed">
              {t('home.accessible.body')}
            </p>
          </div>
        </div>
      </section>

      {/* Why now */}
      <section className="bg-axp-ink text-white">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-4xl">
            <Eyebrow>{t('home.newSections.whyNow2.eyebrow')}</Eyebrow>
            <h2 className="mt-6 font-display font-light text-4xl sm:text-5xl md:text-6xl leading-[1.05] text-white">
              {t('home.newSections.whyNow2.title1')} <span className="text-axp-rose">{t('home.newSections.whyNow2.titleAccent')}</span>
            </h2>
            <p className="mt-8 text-lg md:text-xl text-white/70 font-light leading-relaxed">
              {t('home.newSections.whyNow2.body')}
            </p>
            <p className="mt-6 text-xl md:text-2xl text-white font-light leading-snug">
              {t('home.newSections.whyNow2.kicker')}
            </p>
          </div>
        </div>
      </section>


      {/* The Vision */}
      <section className="bg-white border-y border-axp-line">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-4xl mx-auto text-center">
            <Eyebrow>{t('home.newSections.vision.eyebrow')}</Eyebrow>
            <SectionHeading className="mt-6">
              {t('home.newSections.vision.title1')} <span className="text-axp-rose">{t('home.newSections.vision.titleAccent')}</span>
            </SectionHeading>

            <div className="mt-14 grid sm:grid-cols-2 gap-6 text-left">
              <div className="rounded-3xl border border-axp-line bg-axp-warm-white p-8">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-axp-ink/55">{t('home.newSections.vision.todayLabel')}</p>
                <p className="mt-4 font-display text-2xl font-light text-axp-ink">{t('home.newSections.vision.todayLine1')}</p>
                <p className="font-display text-2xl font-light text-axp-ink">{t('home.newSections.vision.todayLine2')}</p>
              </div>
              <div className="rounded-3xl border border-axp-ink bg-axp-ink p-8 text-white">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-axp-rose">{t('home.newSections.vision.tomorrowLabel')}</p>
                <p className="mt-4 font-display text-2xl font-light">{t('home.newSections.vision.tomorrowLine1')}</p>
                <p className="font-display text-2xl font-light text-axp-rose">{t('home.newSections.vision.tomorrowLine2')}</p>
              </div>
            </div>

            <p className="mt-12 text-lg md:text-xl text-axp-ink/70 font-light leading-relaxed">
              {t('home.newSections.vision.closing')}
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
          <Eyebrow className="!text-axp-rose">{t('home.newSections.finalCta.eyebrow')}</Eyebrow>
          <SectionHeading className="!text-white max-w-4xl mx-auto mt-6">
            {t('home.newSections.finalCta.title1')} <span className="text-axp-rose">{t('home.newSections.finalCta.titleAccent')}</span>
          </SectionHeading>
          <p className="mt-6 text-lg text-white/70 font-light max-w-2xl mx-auto">
            {t('home.newSections.finalCta.body')}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="rounded-full px-8 h-12 bg-axp-rose hover:bg-axp-rose/90 text-white">
              <Link to="/contact">{t('home.newSections.finalCta.bookDemo')} <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-8 h-12 border-white/30 text-white hover:bg-white/10">
              <Link to="/contact">{t('home.newSections.finalCta.talkEnterprise')}</Link>
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

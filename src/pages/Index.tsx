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

            <div className="mt-6">
              <Link to="/explore" className="inline-flex items-center gap-2 font-body text-axp-ink/70 hover:text-axp-ink transition-colors">
                <Play className="w-4 h-4" /> {t('home.hero.watchDemo')}
              </Link>
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

      <section className="bg-axp-ink text-axp-warm-white">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-5xl mx-auto">
            <Eyebrow>{t('home.eyebrow.theShift')}</Eyebrow>
            <h2 className="mt-6 font-display font-light text-4xl sm:text-5xl md:text-6xl leading-[1.05] text-white max-w-4xl">
              {t('home.shift.title1')} <span className="text-axp-rose">{t('home.shift.title2')}</span>
            </h2>
            <p className="mt-8 text-lg md:text-xl text-white/70 font-light max-w-3xl leading-relaxed">
              {t('home.shift.body')}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-axp-warm-white">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-3xl">
            <Eyebrow>{t('home.eyebrow.whatIs')}</Eyebrow>
            <SectionHeading className="mt-6">{t('home.what.title')}</SectionHeading>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              { icon: Film, key: 'yourCut', accent: true },
              { icon: Languages, key: 'yourLanguage', accent: false },
              { icon: Globe2, key: 'yourWorld', accent: false },
            ].map(({ icon: Icon, key, accent }) => (
              <div key={key} className={`rounded-3xl p-8 lg:p-10 border ${accent ? 'bg-axp-ink text-white border-axp-ink' : 'bg-white text-axp-ink border-axp-line'}`}>
                <Icon className={`w-7 h-7 ${accent ? 'text-axp-rose' : 'text-axp-ink/70'}`} />
                <h3 className={`mt-8 font-display text-3xl font-light ${accent ? 'text-white' : 'text-axp-ink'}`}>{t(`home.what.${key}.title`)}</h3>
                <p className={`mt-4 font-body leading-relaxed ${accent ? 'text-white/75' : 'text-axp-ink/65'}`}>{t(`home.what.${key}.body`)}</p>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <Link to="/enterprise" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.22em] text-axp-ink hover:text-axp-rose transition-colors">
              {t('home.what.seeHow')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-axp-line">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5">
              <Eyebrow>{t('home.eyebrow.howItWorks')}</Eyebrow>
              <SectionHeading className="mt-6">{t('home.how.title')}</SectionHeading>
              <p className="mt-8 text-lg text-axp-ink/70 font-light leading-relaxed">
                {t('home.how.body')}
              </p>
            </div>

            <div className="lg:col-span-7 rounded-3xl overflow-hidden border border-axp-line bg-axp-ink">
              <img src={postersImage.url} alt="Axessplayer original adaptive story posters" className="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* Three tiers - Human soul, AI scale, one engine (slide 5) */}
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

      {/* The Moat (slide 7) */}
      <section className="bg-axp-warm-white">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-4xl">
            <Eyebrow>{t('home.moat.eyebrow')}</Eyebrow>
            <SectionHeading className="mt-6">
              {t('home.moat.title1')} <span className="text-axp-ink/55">{t('home.moat.title2')}</span>
            </SectionHeading>
          </div>

          <div className="mt-16 grid md:grid-cols-2 gap-6 lg:gap-8">
            {[
              { n: '01', key: '1', icon: Layers },
              { n: '02', key: '2', icon: Globe2 },
              { n: '03', key: '3', icon: Brain },
              { n: '04', key: '4', icon: ShieldCheck },
            ].map(({ n, key, icon: Icon }) => (
              <div key={n} className="rounded-3xl p-8 lg:p-10 border border-axp-line bg-white">
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-xs text-axp-ink/40">{n}</span>
                  <Icon className="w-6 h-6 text-axp-rose" />
                </div>
                <h3 className="mt-6 font-display text-2xl lg:text-3xl font-light text-axp-ink leading-snug">{t(`home.moat.items.${key}.title`)}</h3>
                <p className="mt-4 font-body leading-relaxed text-axp-ink/65">{t(`home.moat.items.${key}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dynamic Product Placement (slide 12) */}
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

      {/* Go-to-Market (slide 13) */}
      <section className="bg-axp-warm-white">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-4xl">
            <Eyebrow>{t('home.gtm.eyebrow')}</Eyebrow>
            <SectionHeading className="mt-6">
              {t('home.gtm.title1')} <span className="text-axp-ink/55">{t('home.gtm.title2')}</span>
            </SectionHeading>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              { n: '01', key: '1' },
              { n: '02', key: '2' },
              { n: '03', key: '3' },
            ].map(({ n, key }) => (
              <div key={n} className="rounded-3xl p-8 lg:p-10 border border-axp-line bg-white">
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-xs text-axp-ink/40">{n}</span>
                  <MapPin className="w-5 h-5 text-axp-rose" />
                </div>
                <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-axp-rose">{t(`home.gtm.items.${key}.tag`)}</p>
                <h3 className="mt-3 font-display text-2xl lg:text-3xl font-light text-axp-ink leading-snug">{t(`home.gtm.items.${key}.region`)}</h3>
                <p className="mt-4 font-body leading-relaxed text-axp-ink/65">{t(`home.gtm.items.${key}.body`)}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 max-w-3xl border-l-2 border-axp-rose pl-6">
            <p className="font-display text-xl lg:text-2xl font-light text-axp-ink leading-snug italic">
              {t('home.gtm.loop')}
            </p>
          </div>
        </div>
      </section>

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

      <section className="bg-axp-ink text-white">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Eyebrow>{t('home.eyebrow.forBrands')}</Eyebrow>
              <h2 className="mt-6 font-display font-light text-4xl sm:text-5xl md:text-6xl leading-[1.05] text-white">
                {t('home.brands.title1')} <span className="text-axp-gold">{t('home.brands.title2')}</span> {t('home.brands.title3')}
              </h2>
              <p className="mt-8 text-lg text-white/70 font-light leading-relaxed max-w-xl">
                {t('home.brands.body')}
              </p>
              <div className="mt-10">
                <Link to="/enterprise" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.22em] text-axp-gold hover:text-white transition-colors">
                  {t('home.brands.partner')} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden border border-white/20 bg-black">
              <img src={appGridImage.url} alt="Axessplayer library and trending recommendations" className="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-axp-warm-white">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-4xl">
            <Eyebrow>{t('home.eyebrow.whyNow')}</Eyebrow>
            <SectionHeading className="mt-6">{t('home.whyNow.title')}</SectionHeading>
            <p className="mt-8 text-lg md:text-xl text-axp-ink/70 font-light leading-relaxed">
              {t('home.whyNow.body')}
            </p>
            <div className="mt-10 inline-flex items-center px-5 py-3 rounded-full border border-axp-ink/15 bg-white">
              <p className="font-body text-sm text-axp-ink">{t('home.whyNow.builtBy', { name: 'Eko' })}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-axp-line">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-3xl">
            <Eyebrow>{t('home.eyebrow.howToWatch')}</Eyebrow>
            <SectionHeading className="mt-6">{t('home.howToWatch.title')}</SectionHeading>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-6">
            {[
              { key: 'earn', icon: Gift },
              { key: 'buy', icon: ShoppingBag },
              { key: 'subscribe', icon: Repeat },
            ].map(({ key, icon: Icon }) => (
              <div key={key} className="rounded-3xl border border-axp-line p-8 bg-axp-warm-white">
                <Icon className="w-6 h-6 text-axp-rose" />
                <p className="mt-6 font-mono text-xs uppercase tracking-[0.22em] text-axp-ink/55">{t(`home.howToWatch.${key}.tag`)}</p>
                <p className="mt-3 font-display text-2xl font-light text-axp-ink leading-snug">{t(`home.howToWatch.${key}.title`)}</p>
              </div>
            ))}
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
          <SectionHeading className="!text-white max-w-4xl mx-auto">
            {t('home.final.title1')} <span className="text-axp-rose">{t('home.final.titleAccent')}</span> {t('home.final.title2')}
          </SectionHeading>
          <p className="mt-6 text-lg text-white/70 font-light max-w-2xl mx-auto">
            {t('home.final.body')}
          </p>
          <div className="mt-12">
            <EarlyAccessForm variant="dark" source="home-final" microcopy={t('home.final.microcopy')} />
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

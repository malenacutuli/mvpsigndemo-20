import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navigation } from '@/components/Navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { EarlyAccessForm } from '@/components/EarlyAccessForm';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, Globe2, Sparkles, Layers, Film, Languages, Accessibility } from 'lucide-react';
import logoWhite from '@/assets/axessplayer-logo-white.png.asset.json';
import heroPhone from '@/assets/axessplayer-hero-phone.png.asset.json';
import rewardsScreen from '@/assets/axessplayer-rewards-screen.png.asset.json';
import postersImage from '@/assets/axessplayer-posters.png.asset.json';
import appGridImage from '@/assets/axessplayer-app-grid.png.asset.json';

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
            <div className="mt-10 inline-flex items-center gap-3 px-5 py-3 rounded-full border border-axp-ink/15 bg-white">
              <Sparkles className="w-4 h-4 text-axp-rose" />
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
              { key: 'earn', icon: Layers },
              { key: 'buy', icon: Sparkles },
              { key: 'subscribe', icon: Accessibility },
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
          <div className="grid md:grid-cols-5 gap-10">
            <div className="md:col-span-2">
              <img src={logoWhite.url} alt="Axessplayer" className="h-8 w-auto" />
              <p className="mt-5 text-white/55 font-body text-sm max-w-xs">{t('home.footer.by')}</p>
            </div>
            {[
              { h: t('home.footer.platform'), items: [[t('home.footer.howItWorks'), '/'], [t('home.footer.accessibility'), '/enterprise'], [t('home.footer.forBrands'), '/enterprise'], [t('home.footer.demo'), '/explore']] },
              { h: t('home.footer.enterprise'), items: [[t('home.footer.overview'), '/enterprise'], [t('home.footer.compliance'), '/enterprise'], [t('home.footer.bookDemo'), '/contact']] },
              { h: t('home.footer.company'), items: [[t('home.footer.about'), '/about'], [t('home.footer.contact'), '/contact']] },
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

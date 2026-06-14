import React from 'react';
import { Link } from 'react-router-dom';
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
  if (isDemo) return <DemoHome />;

  return (
    <div className="min-h-screen bg-axp-warm-white text-axp-ink font-body antialiased">
      <Navigation />

      <section className="bg-axp-warm-white">
        <div className="container mx-auto px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 lg:pt-32 lg:pb-36">
          <div className="max-w-5xl mx-auto text-center">
            <Eyebrow>Adaptive Cinema</Eyebrow>
            <h1 className="mt-6 font-display font-light tracking-tight text-axp-ink text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.98]">
              The story re-cuts itself <span className="text-axp-rose">for every viewer.</span>
            </h1>
            <p className="mt-8 text-lg sm:text-xl md:text-2xl text-axp-ink/70 font-light max-w-3xl mx-auto leading-relaxed">
              One production. A different version for each person: your cut, your language, your world.
              Streaming shows everyone the same thing. Axessplayer does not.
            </p>

            <div className="mt-10 max-w-xl mx-auto">
              <EarlyAccessForm variant="light" source="home-hero" />
            </div>

            <div className="mt-6">
              <Link to="/explore" className="inline-flex items-center gap-2 font-body text-axp-ink/70 hover:text-axp-ink transition-colors">
                <Play className="w-4 h-4" /> Watch the demo
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
            <Eyebrow>The shift</Eyebrow>
            <h2 className="mt-6 font-display font-light text-4xl sm:text-5xl md:text-6xl leading-[1.05] text-white max-w-4xl">
              Everyone is optimizing distribution. <span className="text-axp-rose">Nobody owns adaptation.</span>
            </h2>
            <p className="mt-8 text-lg md:text-xl text-white/70 font-light max-w-3xl leading-relaxed">
              The microdrama boom competes on one axis: more content, cheaper, better recommended.
              Every platform still ships one fixed cut to everyone. The story itself never changes.
              That is the opening.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-axp-warm-white">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-3xl">
            <Eyebrow>What is adaptive cinema</Eyebrow>
            <SectionHeading className="mt-6">One story. Re-cut for you.</SectionHeading>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                icon: Film,
                title: 'Your cut.',
                body: 'POV, pacing, intensity, and ending, chosen automatically from how you watch. No menus.',
                accent: true,
              },
              {
                icon: Languages,
                title: 'Your language.',
                body: 'One master, every language, accessible by default, at near-zero marginal cost.',
              },
              {
                icon: Globe2,
                title: 'Your world.',
                body: 'The same scene, the right brand for your market. Canon-safe, never an interruption.',
              },
            ].map(({ icon: Icon, title, body, accent }) => (
              <div key={title} className={`rounded-3xl p-8 lg:p-10 border ${accent ? 'bg-axp-ink text-white border-axp-ink' : 'bg-white text-axp-ink border-axp-line'}`}>
                <Icon className={`w-7 h-7 ${accent ? 'text-axp-rose' : 'text-axp-ink/70'}`} />
                <h3 className={`mt-8 font-display text-3xl font-light ${accent ? 'text-white' : 'text-axp-ink'}`}>{title}</h3>
                <p className={`mt-4 font-body leading-relaxed ${accent ? 'text-white/75' : 'text-axp-ink/65'}`}>{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <Link to="/enterprise" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.22em] text-axp-ink hover:text-axp-rose transition-colors">
              See how it works <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-axp-line">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5">
              <Eyebrow>How it works</Eyebrow>
              <SectionHeading className="mt-6">Human soul, AI scale, one engine.</SectionHeading>
              <p className="mt-8 text-lg text-axp-ink/70 font-light leading-relaxed">
                Filmed scenes carry the soul and the clips. AI generates the variants, the languages,
                and the localizations. One decision engine reads how each person watches and serves
                the right cut automatically.
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
            <Eyebrow>Accessible by default</Eyebrow>
            <SectionHeading className="mt-6">
              Built so everyone can watch. <span className="text-axp-ink/55">From the first frame.</span>
            </SectionHeading>
            <p className="mt-8 text-lg md:text-xl text-axp-ink/70 font-light leading-relaxed">
              Captions with intention, creative audio description, sign language, and dubbing are
              generated for every story in every language, not bolted on later. Accessibility is the
              foundation the whole platform is built on.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-axp-ink text-white">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Eyebrow>For brands</Eyebrow>
              <h2 className="mt-6 font-display font-light text-4xl sm:text-5xl md:text-6xl leading-[1.05] text-white">
                The same scene. <span className="text-axp-gold">A different product</span> for every market.
              </h2>
              <p className="mt-8 text-lg text-white/70 font-light leading-relaxed max-w-xl">
                Dynamic in-scene placement fills a mug, a billboard, or a phone screen with the right
                brand for each viewer, at serve time. First-party attention and data, without
                interrupting the story.
              </p>
              <div className="mt-10">
                <Link to="/enterprise" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.22em] text-axp-gold hover:text-white transition-colors">
                  Partner with us <ArrowRight className="w-4 h-4" />
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
            <Eyebrow>Why now</Eyebrow>
            <SectionHeading className="mt-6">Interactive cinema was tried once. The reasons it failed are gone.</SectionHeading>
            <p className="mt-8 text-lg md:text-xl text-axp-ink/70 font-light leading-relaxed">
              Production, promotion, and format friction killed it a decade ago. AI generates the variants now.
              Vertical, swipeable feeds are the native format. We are rebuilding it with the people who invented interactive video.
            </p>
            <div className="mt-10 inline-flex items-center gap-3 px-5 py-3 rounded-full border border-axp-ink/15 bg-white">
              <Sparkles className="w-4 h-4 text-axp-rose" />
              <p className="font-body text-sm text-axp-ink">
                Built by the team behind <span className="font-medium">Eko</span>, the inventors of seamless branching video.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-axp-line">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-3xl">
            <Eyebrow>How to watch</Eyebrow>
            <SectionHeading className="mt-6">Three ways in. Three ways to pay.</SectionHeading>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-6">
            {[
              { tag: 'Earn', title: 'Watch a rewarded ad, get credits.', icon: Layers },
              { tag: 'Buy', title: 'Credit packs, whenever you want more.', icon: Sparkles },
              { tag: 'Subscribe', title: 'Ad-free, with a credit allowance and premium variants.', icon: Accessibility },
            ].map(({ tag, title, icon: Icon }) => (
              <div key={tag} className="rounded-3xl border border-axp-line p-8 bg-axp-warm-white">
                <Icon className="w-6 h-6 text-axp-rose" />
                <p className="mt-6 font-mono text-xs uppercase tracking-[0.22em] text-axp-ink/55">{tag}</p>
                <p className="mt-3 font-display text-2xl font-light text-axp-ink leading-snug">{title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-axp-ink text-white">
        <div className="container mx-auto px-6 py-28 lg:py-36 text-center">
          <SectionHeading className="!text-white max-w-4xl mx-auto">
            Be first to watch <span className="text-axp-rose">yourself</span> into the story.
          </SectionHeading>
          <p className="mt-6 text-lg text-white/70 font-light max-w-2xl mx-auto">
            Get early access to Axessplayer. We will email you the moment your spot opens.
          </p>
          <div className="mt-12">
            <EarlyAccessForm variant="dark" source="home-final" microcopy="No spam. Unsubscribe anytime." />
          </div>
        </div>
      </section>

      <footer className="bg-axp-ink text-white border-t border-white/10">
        <div className="container mx-auto px-6 py-16">
          <div className="grid md:grid-cols-5 gap-10">
            <div className="md:col-span-2">
              <img src={logoWhite.url} alt="Axessplayer" className="h-8 w-auto" />
              <p className="mt-5 text-white/55 font-body text-sm max-w-xs">Axessplayer, by Axessible Technologies.</p>
            </div>
            {[
              { h: 'Platform', items: [['How it works', '/'], ['Accessibility', '/enterprise'], ['For brands', '/enterprise'], ['Demo', '/explore']] },
              { h: 'Enterprise', items: [['Overview', '/enterprise'], ['Compliance', '/enterprise'], ['Book a demo', '/contact']] },
              { h: 'Company', items: [['About', '/about'], ['Contact', '/contact']] },
            ].map((col) => (
              <div key={col.h}>
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
            <p>One story. Every language. Every person.</p>
            <p>© {new Date().getFullYear()} Axessible Technologies.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;

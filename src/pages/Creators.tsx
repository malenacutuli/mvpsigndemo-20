import { Link } from 'react-router-dom';
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

type Status = 'live' | 'roadmap';

const RoadmapTag = () => (
  <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300 ml-2 align-middle">
    Coming soon
  </span>
);

const benefits: Array<{
  icon: typeof Globe;
  title: string;
  status: Status;
  body: React.ReactNode;
}> = [
  {
    icon: Sparkles,
    title: 'Create at the speed of an idea',
    status: 'live',
    body: (
      <>
        Upload finished episodes and we take it from there. Or describe the series you want and
        watch it take shape, characters, beats, branches, and shots.<RoadmapTag /> Or turn footage
        you already shot, even old or horizontal, into fresh vertical episodes.<RoadmapTag />
      </>
    ),
  },
  {
    icon: Globe,
    title: 'Reach the audience everyone else ignores',
    status: 'live',
    body: (
      <>
        Every episode ships with Captions with Intention, audio description, sign language, and
        dubbing in 40+ languages, on by default. The disabled audience and the global audience that
        competitors leave on the table become yours, without a single extra step. Bigger reach is
        not a project here. It is the default.
      </>
    ),
  },
  {
    icon: Wallet,
    title: 'Earn, and see exactly how',
    status: 'live',
    body: (
      <>
        Keep 70 percent. Coins, episode unlocks, rewarded ads, subscriptions, and premium cuts,
        with the math shown plainly and paid on a transparent, auditable ledger. No dark patterns,
        no opaque deductions, no wondering where the money went.
      </>
    ),
  },
  {
    icon: Handshake,
    title: 'Brand deals that come to you',
    status: 'roadmap',
    body: (
      <>
        Brands looking to live inside stories like yours arrive in your inbox. You approve or
        decline, the product appears inside the scene with real lighting and framing, not a banner,
        and you get paid. You keep full control over who shows up in your work.
      </>
    ),
  },
  {
    icon: ShieldCheck,
    title: 'Own everything, provably',
    status: 'live',
    body: (
      <>
        Your rights, your likeness, your characters, your IP, recorded on a consent ledger with
        provenance and clear AI labeling on every asset. Your work stays yours, and you can prove
        it. The thing other platforms gloss over is the thing we put your name on.
      </>
    ),
  },
  {
    icon: BarChart3,
    title: 'Know what actually works',
    status: 'live',
    body: (
      <>
        See where viewers lean in and where they drop off, which ending wins, which language
        performs, beat by beat. Make your next episode from evidence, not guesses.
      </>
    ),
  },
];

const steps = [
  {
    icon: Upload,
    title: 'Upload once',
    body: 'Drop in your episodes. Generating them from a prompt is on the roadmap.',
  },
  {
    icon: Settings,
    title: 'Set it once',
    body: 'Pick your languages and accessibility tracks (already on), and your pricing. We show the work and the cost before you commit.',
  },
  {
    icon: PlayCircle,
    title: 'Process',
    body: 'Watch captions, descriptions, sign, and dubs generate live. Review anything that wants a human eye.',
  },
  {
    icon: Globe,
    title: 'Publish everywhere',
    body: 'Mobile and web, with your channel, your audience, and your analytics from day one.',
  },
];

const Creators = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 via-background to-background pointer-events-none" />
        <div className="container mx-auto px-6 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge variant="outline" className="font-normal">
              <Wordmark /> Creators
            </Badge>
            <h1 className="text-5xl md:text-7xl font-light text-foreground leading-[1.05] tracking-tight">
              Make it once. Reach everyone.
              <br />
              <span className="text-rose-500">Get paid. Own it all.</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-light leading-relaxed max-w-3xl mx-auto">
              Upload a vertical series, or create one, and <Wordmark /> turns it into something
              accessible, localized in 40+ languages, adapted to every viewer, and ready to earn,
              automatically. You bring the story. We handle everything that usually stands between
              you and an audience.
            </p>
            <p className="text-2xl md:text-3xl font-light text-foreground">
              Create something better. For everyone.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg" className="text-base">
                <Link to="/upload">
                  Start creating <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <Link to="/contact">Join the creator program</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* The promise */}
      <section className="py-24 md:py-32 border-t bg-muted/20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-sm font-medium uppercase tracking-widest text-rose-500">The promise</h2>
            <p className="text-2xl md:text-3xl font-light text-foreground leading-snug">
              Making a series used to mean a crew, a post house, a translation vendor, an
              accessibility audit, and a year. Then you still had to find an audience and hope you
              got paid fairly.
            </p>
            <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
              <Wordmark /> collapses all of that into one upload and one screen. The hard parts
              happen on their own. You stay in the part you love: the story.
            </p>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto space-y-4">
            <h2 className="text-4xl md:text-5xl font-light text-foreground leading-tight">
              What you get
            </h2>
            <p className="text-lg text-muted-foreground font-light">
              Six ways <Wordmark /> works for you, from upload to payout.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.title}
                  className="bg-card rounded-2xl border p-8 shadow-soft hover:shadow-elegant transition-shadow space-y-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-rose-500" />
                  </div>
                  <h3 className="text-2xl font-light text-foreground leading-snug">
                    {b.title}
                    {b.status === 'roadmap' && <RoadmapTag />}
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
            <h2 className="text-4xl md:text-5xl font-light text-foreground leading-tight">
              How it works
            </h2>
            <p className="text-lg text-muted-foreground font-light">
              One click does the work of a whole post-production team. You stay the creator, not the
              operations department.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="bg-card rounded-2xl border p-6 shadow-soft space-y-4">
                  <div className="text-sm font-medium text-rose-500">Step {i + 1}</div>
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
              <h2 className="text-sm font-medium uppercase tracking-widest text-rose-500">Why now</h2>
              <h3 className="text-4xl md:text-5xl font-light text-foreground leading-tight">
                Ride the wave without a studio behind you.
              </h3>
            </div>
            <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed">
              Vertical short drama is the fastest-growing thing in mobile, AI just made producing it
              many times cheaper, and the platforms that win are the ones that help you make more,
              reach more, and keep more of what you earn. That is exactly what <Wordmark /> is for.
            </p>
            <p className="text-xl md:text-2xl font-light text-foreground leading-snug text-center">
              Your story deserves every audience, every language, and every screen. And it deserves
              to pay you fairly while it stays yours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button asChild size="lg" className="text-base">
                <Link to="/upload">
                  Start creating <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base">
                <Link to="/contact">See how creators earn</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Creators;

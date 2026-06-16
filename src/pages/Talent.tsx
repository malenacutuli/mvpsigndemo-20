import React from 'react';
import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { TalentForm } from '@/components/TalentForm';
import { ArrowRight, ShieldCheck, UserCheck, Wallet, Sparkles, Globe2, FileSignature, Eye, BadgeCheck } from 'lucide-react';

const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`font-mono text-[11px] sm:text-xs uppercase tracking-[0.22em] text-axp-rose ${className}`}>
    {children}
  </p>
);

const SectionHeading: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h2 className={`font-display text-4xl sm:text-5xl md:text-6xl font-light tracking-tight leading-[1.05] ${className}`}>
    {children}
  </h2>
);

const Talent: React.FC = () => {
  return (
    <div className="min-h-screen bg-axp-warm-white text-axp-ink font-body antialiased">
      <Navigation />

      {/* Hero */}
      <section className="bg-axp-ink text-white">
        <div className="container mx-auto px-6 pt-24 pb-24 sm:pt-32 sm:pb-32 lg:pt-36 lg:pb-40">
          <div className="max-w-5xl mx-auto text-center">
            <Eyebrow>For Talent</Eyebrow>
            <h1 className="mt-6 font-display font-light tracking-tight text-white text-5xl sm:text-6xl md:text-7xl leading-[0.98]">
              AI Likeness <span className="text-axp-rose">Agents.</span>
            </h1>
            <p className="mt-8 font-display font-light text-2xl sm:text-3xl md:text-4xl text-white/85 leading-snug">
              Ensure you get paid for your talent.
            </p>
            <p className="mt-8 text-lg sm:text-xl text-white/65 font-light max-w-3xl mx-auto leading-relaxed">
              Your face, voice, and sign language are valuable assets. Axessplayer is the registry where verified humans license their likeness to brands, broadcasters, and AI labs, with terms you set and revenue that flows back every time it is used.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="#apply" className="inline-flex items-center gap-2 bg-axp-rose hover:bg-axp-rose/90 text-white font-mono text-xs uppercase tracking-[0.22em] px-6 py-4 rounded-full transition-colors">
                License my likeness <ArrowRight className="w-4 h-4" />
              </a>
              <Link to="/" className="text-white/70 hover:text-white font-body text-sm">
                Back to home
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-white/60 font-body text-sm">
              <span className="inline-flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-axp-rose" /> Free to join</span>
              <span className="inline-flex items-center gap-2"><UserCheck className="w-4 h-4 text-axp-rose" /> Ten minute signup</span>
              <span className="inline-flex items-center gap-2"><Eye className="w-4 h-4 text-axp-rose" /> You approve every job</span>
            </div>
          </div>
        </div>
      </section>

      {/* Why this exists */}
      <section className="bg-axp-warm-white">
        <div className="container mx-auto px-6 py-28 lg:py-32">
          <div className="max-w-4xl">
            <Eyebrow>Why this exists</Eyebrow>
            <SectionHeading className="mt-6 text-axp-ink">
              AI needs human faces. It should pay for them.
            </SectionHeading>
            <p className="mt-8 text-lg md:text-xl text-axp-ink/70 font-light leading-relaxed">
              Studios, advertisers, and AI labs already train on, regenerate, and re-target human likeness at scale. Most of that value never reaches the person whose face, voice, or signing made the moment work. We built the opposite model. Every render goes through a licensing layer where the talent owns the keys.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-y border-axp-line">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-3xl">
            <Eyebrow>How it works</Eyebrow>
            <SectionHeading className="mt-6 text-axp-ink">Four steps from signup to payout.</SectionHeading>
          </div>

          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                icon: UserCheck,
                title: 'Verify once',
                body: 'A ten minute capture session records your face, voice, and optional sign language. We confirm it is really you with liveness checks and ID.',
              },
              {
                step: '02',
                icon: FileSignature,
                title: 'Set your terms',
                body: 'Choose the markets, categories, and contexts you accept. Block political content, adult, gambling, or specific competitors with one toggle.',
              },
              {
                step: '03',
                icon: Eye,
                title: 'Approve each job',
                body: 'Every request lands in your inbox with the script, brand, and run window. You approve, edit, or decline before a single frame renders.',
              },
              {
                step: '04',
                icon: Wallet,
                title: 'Get paid per use',
                body: 'You earn each time your likeness ships in a campaign or episode. Payouts settle monthly with a transparent ledger of every render.',
              },
            ].map(({ step, icon: Icon, title, body }) => (
              <div key={step} className="rounded-3xl border border-axp-line bg-axp-warm-white p-8">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-axp-ink/45">{step}</p>
                <Icon className="mt-6 w-7 h-7 text-axp-rose" />
                <h3 className="mt-6 font-display text-2xl font-light text-axp-ink leading-snug">{title}</h3>
                <p className="mt-4 text-axp-ink/65 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What they get paid */}
      <section className="bg-axp-warm-white">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-3xl">
            <Eyebrow>What you get paid</Eyebrow>
            <SectionHeading className="mt-6 text-axp-ink">A revenue split that respects the person, not just the platform.</SectionHeading>
            <p className="mt-8 text-lg text-axp-ink/70 font-light leading-relaxed">
              Talent keeps the majority of every license fee. No buried agency take, no perpetual buyouts, no surprise re-use. The full ledger is visible to you at all times.
            </p>
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {[
              { tier: 'Standard license', pct: '75%', body: 'Your share of every approved render across brand campaigns, episodic content, and AI dubbing.' },
              { tier: 'Exclusive lockup', pct: '85%', body: 'When a buyer wants category exclusivity for a defined window, your share goes up and the floor price rises with it.' },
              { tier: 'Sign language and dubbing', pct: '80%', body: 'Specialist work like ASL, LSE, and multilingual voice carries a higher base because there are fewer verified humans who can do it.' },
            ].map(({ tier, pct, body }) => (
              <div key={tier} className="rounded-3xl border border-axp-line bg-white p-8">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-axp-ink/55">{tier}</p>
                <p className="mt-6 font-display text-6xl font-light text-axp-rose leading-none">{pct}</p>
                <p className="mt-4 text-axp-ink/65 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-3xl border border-axp-line bg-white p-8 lg:p-10">
            <Eyebrow>Example payout</Eyebrow>
            <p className="mt-4 font-display text-2xl sm:text-3xl font-light text-axp-ink leading-snug max-w-3xl">
              A ten market campaign licenses your face for a six week run at a base rate of 2,000 EUR per market. Standard split, no exclusivity. You receive 15,000 EUR. Each additional renewal renders the same way: approved, logged, paid.
            </p>
          </div>
        </div>
      </section>

      {/* Protections */}
      <section className="bg-axp-ink text-white">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-3xl">
            <Eyebrow>Built in protections</Eyebrow>
            <SectionHeading className="mt-6 text-white">Consent is a feature, not a contract you sign once and forget.</SectionHeading>
          </div>

          <div className="mt-14 grid md:grid-cols-2 gap-6">
            {[
              { icon: ShieldCheck, title: 'Hard blocks you control', body: 'Political messaging, adult, gambling, weapons, crypto, and named competitors can be permanently blocked at the account level.' },
              { icon: BadgeCheck, title: 'Liveness and provenance', body: 'Every render is signed and traceable. If anything ships outside the approved scope, it is flagged automatically and removed.' },
              { icon: Globe2, title: 'Right to walk away', body: 'You can revoke future use at any time. Active campaigns finish their window and no new renders are produced.' },
              { icon: Sparkles, title: 'Adaptive cinema built in', body: 'Your likeness powers stories adapted per viewer, per language, and per market, without re-shoots or extra sessions.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-3xl border border-white/15 bg-white/5 p-8">
                <Icon className="w-7 h-7 text-axp-rose" />
                <h3 className="mt-6 font-display text-2xl font-light text-white leading-snug">{title}</h3>
                <p className="mt-4 text-white/70 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white border-y border-axp-line">
        <div className="container mx-auto px-6 py-28 lg:py-32">
          <div className="max-w-3xl">
            <Eyebrow>Common questions</Eyebrow>
            <SectionHeading className="mt-6 text-axp-ink">The honest version.</SectionHeading>
          </div>

          <div className="mt-14 grid md:grid-cols-2 gap-x-12 gap-y-10 max-w-5xl">
            {[
              { q: 'Do I lose ownership of my face?', a: 'No. You grant a revocable license per approved job. Your likeness remains yours.' },
              { q: 'Can I sign with an agent or manager?', a: 'Yes. You can route notifications and payouts to a representative while keeping final approval rights.' },
              { q: 'What about union rules?', a: 'We respect SAG AFTRA and equivalent collective agreements. Jobs flagged as union work follow the rate cards in force at the time of approval.' },
              { q: 'How fast do I get paid?', a: 'Monthly settlement, with the ledger visible in real time as renders ship.' },
            ].map(({ q, a }) => (
              <div key={q}>
                <h3 className="font-display text-xl font-light text-axp-ink">{q}</h3>
                <p className="mt-3 text-axp-ink/65 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Apply */}
      <section id="apply" className="bg-axp-warm-white">
        <div className="container mx-auto px-6 py-28 lg:py-36">
          <div className="max-w-3xl mx-auto text-center">
            <Eyebrow>Apply to join</Eyebrow>
            <SectionHeading className="mt-6 text-axp-ink">License your likeness. On your terms.</SectionHeading>
            <p className="mt-8 text-lg text-axp-ink/70 font-light leading-relaxed">
              Tell us a little about yourself. We will reach out with a verification slot and walk you through the licensing dashboard.
            </p>
          </div>
          <div className="mt-12 max-w-3xl mx-auto rounded-3xl bg-white border border-axp-line p-6 sm:p-10">
            <TalentForm />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Talent;

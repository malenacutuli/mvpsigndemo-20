import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { ArrowRight, Check } from 'lucide-react';

const emailSchema = z.string().trim().email('Enter a valid email').max(255);

interface Props {
  source?: string;
  variant?: 'light' | 'dark';
  microcopy?: string;
}

export const EarlyAccessForm: React.FC<Props> = ({
  source = 'home',
  variant = 'dark',
  microcopy = 'No spam. One email when your access is ready.',
}) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid email');
      setStatus('error');
      return;
    }
    setStatus('loading');
    const { error: insertError } = await supabase
      .from('early_access_signups' as never)
      .insert({
        email: parsed.data.toLowerCase(),
        source,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        referrer: typeof document !== 'undefined' ? document.referrer : null,
      } as never);
    if (insertError && !/duplicate key/i.test(insertError.message)) {
      setStatus('error');
      setError('Something went wrong. Try again.');
      return;
    }
    setStatus('success');
  };

  const isDark = variant === 'dark';
  const inputBase =
    'flex-1 h-14 px-5 rounded-full border bg-transparent text-base font-body placeholder:text-current/50 focus:outline-none focus:ring-2';
  const inputCls = isDark
    ? `${inputBase} border-white/20 text-white placeholder:text-white/50 focus:ring-axp-rose`
    : `${inputBase} border-axp-ink/15 text-axp-ink placeholder:text-axp-ink/40 focus:ring-axp-rose`;

  if (status === 'success') {
    return (
      <div className={`flex items-center gap-3 justify-center font-body ${isDark ? 'text-white' : 'text-axp-ink'}`}>
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-axp-rose text-white">
          <Check className="w-5 h-5" />
        </span>
        <span>You're on the list. We'll be in touch.</span>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <label htmlFor={`ea-${source}`} className="sr-only">Email address</label>
        <input
          id={`ea-${source}`}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
          className={inputCls}
          aria-invalid={status === 'error'}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex items-center justify-center gap-2 h-14 px-7 rounded-full bg-axp-rose text-white font-body font-medium hover:bg-axp-rose/90 transition-colors disabled:opacity-60"
        >
          {status === 'loading' ? 'Sending…' : 'Get early access'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      <p className={`mt-3 text-sm font-body ${isDark ? 'text-white/60' : 'text-axp-ink/55'}`}>
        {error ?? microcopy}
      </p>
    </form>
  );
};

CREATE TABLE public.early_access_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  source text,
  user_agent text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX early_access_signups_email_lower_idx
  ON public.early_access_signups (lower(email));

GRANT INSERT ON public.early_access_signups TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.early_access_signups TO authenticated;
GRANT ALL ON public.early_access_signups TO service_role;

ALTER TABLE public.early_access_signups ENABLE ROW LEVEL SECURITY;

-- Anyone can submit their email
CREATE POLICY "Anyone can sign up for early access"
  ON public.early_access_signups
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (email IS NOT NULL AND length(email) > 3 AND length(email) < 320);

-- Only admins can read or manage
CREATE POLICY "Admins can view signups"
  ON public.early_access_signups
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete signups"
  ON public.early_access_signups
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
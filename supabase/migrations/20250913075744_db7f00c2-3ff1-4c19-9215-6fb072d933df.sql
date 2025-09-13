-- Harden channel_subscriptions email protection: encrypt at rest, remove confusing deny policy, keep UX intact

-- 0) Ensure pgcrypto is available for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Secure secrets store (in-DB) for encryption key and salt
CREATE TABLE IF NOT EXISTS public.app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Only service role can manage secrets" ON public.app_secrets;
CREATE POLICY "Only service role can manage secrets"
ON public.app_secrets
FOR ALL
USING (current_setting('role'::text) = 'service_role'::text)
WITH CHECK (current_setting('role'::text) = 'service_role'::text);

-- Seed secrets if missing (hex-encoded random strings)
INSERT INTO public.app_secrets (key, value)
VALUES 
  ('email_encryption_key', encode(gen_random_bytes(32), 'hex')),
  ('email_hash_salt', encode(gen_random_bytes(16), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- 2) Helper functions (security definer) to access secrets and crypto
CREATE OR REPLACE FUNCTION public.get_secret(p_key text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.app_secrets WHERE key = p_key;
$$;

CREATE OR REPLACE FUNCTION public.encrypt_email(p_email text)
RETURNS bytea
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pgp_sym_encrypt(p_email, public.get_secret('email_encryption_key'));
$$;

CREATE OR REPLACE FUNCTION public.decrypt_email(p_enc bytea)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pgp_sym_decrypt(p_enc, public.get_secret('email_encryption_key'));
$$;

CREATE OR REPLACE FUNCTION public.hash_email(p_email text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT encode(digest(lower(trim(p_email)) || COALESCE(public.get_secret('email_hash_salt'), ''), 'sha256'), 'hex');
$$;

-- 3) Add encrypted + hashed email columns
ALTER TABLE public.channel_subscriptions
  ADD COLUMN IF NOT EXISTS subscriber_email_enc bytea,
  ADD COLUMN IF NOT EXISTS subscriber_email_hash text;

-- Index to prevent duplicates and speed lookups by email hash per channel
CREATE INDEX IF NOT EXISTS idx_channel_subscriptions_email_hash
  ON public.channel_subscriptions(channel_id, subscriber_email_hash);

-- 4) Encrypt on write via trigger; remove plaintext before storing
CREATE OR REPLACE FUNCTION public.mask_and_encrypt_subscriber_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.subscriber_email IS NOT NULL THEN
    NEW.subscriber_email_hash := public.hash_email(NEW.subscriber_email);
    NEW.subscriber_email_enc := public.encrypt_email(NEW.subscriber_email);
    NEW.subscriber_email := NULL; -- do not store plaintext
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_channel_sub_email ON public.channel_subscriptions;
CREATE TRIGGER trg_encrypt_channel_sub_email
BEFORE INSERT OR UPDATE OF subscriber_email ON public.channel_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.mask_and_encrypt_subscriber_email();

-- Backfill existing plaintext emails (if any)
UPDATE public.channel_subscriptions
SET subscriber_email_enc = public.encrypt_email(subscriber_email),
    subscriber_email_hash = public.hash_email(subscriber_email),
    subscriber_email = NULL
WHERE subscriber_email IS NOT NULL;

-- 5) RLS cleanup to avoid confusion: remove redundant deny policy and direct owner read policy
DROP POLICY IF EXISTS "Deny unauthorized subscription access" ON public.channel_subscriptions;
DROP POLICY IF EXISTS "Channel owners can view their subscribers with emails" ON public.channel_subscriptions;
DROP POLICY IF EXISTS "Channel owners view own subscribers only" ON public.channel_subscriptions;

-- Keep/ensure self-view for subscribers (required by UI like Explore.tsx)
DROP POLICY IF EXISTS "Users view own subscription status only" ON public.channel_subscriptions;
CREATE POLICY "Users view own subscription status only"
ON public.channel_subscriptions
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND subscriber_user_id = auth.uid() AND subscriber_user_id IS NOT NULL
);

-- 6) Secure owner access via function that decrypts emails (no direct table SELECT needed)
CREATE OR REPLACE FUNCTION public.get_channel_subscribers(channel_uuid uuid)
RETURNS TABLE(
  id uuid,
  subscriber_user_id uuid,
  subscriber_email text,
  subscribed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.channels WHERE id = channel_uuid AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You can only view subscribers for your own channels';
  END IF;

  RETURN QUERY
  SELECT cs.id,
         cs.subscriber_user_id,
         public.decrypt_email(cs.subscriber_email_enc) AS subscriber_email,
         cs.subscribed_at
  FROM public.channel_subscriptions cs
  WHERE cs.channel_id = channel_uuid;
END;
$$;
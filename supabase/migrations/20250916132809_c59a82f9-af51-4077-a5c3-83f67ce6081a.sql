-- CRITICAL SECURITY FIX: Remove vulnerable RLS policy that exposes subscriber data
-- The "Service role can manage subscribers" policy currently uses "true" which allows public access
-- This is a critical vulnerability that exposes email addresses and Stripe customer IDs

-- Drop the vulnerable policy that allows unrestricted access
DROP POLICY IF EXISTS "Service role can manage subscribers" ON public.subscribers;

-- Ensure we have the correct service role policy that properly restricts access  
-- This policy already exists but let's recreate it to be sure it's correct
DROP POLICY IF EXISTS "System can manage all subscriptions" ON public.subscribers;

CREATE POLICY "System can manage all subscriptions" ON public.subscribers
FOR ALL 
USING (current_setting('role') = 'service_role')
WITH CHECK (current_setting('role') = 'service_role');

-- Add additional security: Ensure no other access is allowed
-- Block any potential SELECT queries from non-service roles
CREATE POLICY "Block all SELECT access except service role" ON public.subscribers
FOR SELECT 
USING (false);

-- Block any potential INSERT access from non-service roles  
CREATE POLICY "Block all INSERT access except service role" ON public.subscribers
FOR INSERT 
WITH CHECK (false);

-- Block any potential UPDATE access from non-service roles
CREATE POLICY "Block all UPDATE access except service role" ON public.subscribers
FOR UPDATE 
USING (false)
WITH CHECK (false);

-- Block any potential DELETE access from non-service roles
CREATE POLICY "Block all DELETE access except service role" ON public.subscribers  
FOR DELETE
USING (false);

-- Verify RLS is enabled (it already is, but let's be explicit)
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Add comment for security documentation
COMMENT ON TABLE public.subscribers IS 'SECURITY: Contains sensitive user data including emails and Stripe IDs. Access restricted to service role only.';
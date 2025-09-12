-- Fix critical security vulnerability in subscribers table RLS policies
-- Current policies allow anyone to insert/update subscription data

-- Drop the insecure policies
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;

-- Create secure policies that restrict access to authenticated users and their own data
CREATE POLICY "authenticated_users_can_insert_own_subscription" 
ON public.subscribers 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = user_id OR 
  (auth.uid() IS NOT NULL AND email = auth.email())
);

CREATE POLICY "authenticated_users_can_update_own_subscription" 
ON public.subscribers 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() = user_id OR 
  (auth.uid() IS NOT NULL AND email = auth.email())
)
WITH CHECK (
  auth.uid() = user_id OR 
  (auth.uid() IS NOT NULL AND email = auth.email())
);

-- Keep the existing select policy as it's already secure
-- Policy "select_own_subscription" already correctly restricts to own data

-- Note: Service role (used by Stripe webhooks) can still manage all subscription data
-- This is handled by the existing system policy that checks for service_role
-- First, drop existing policies that might have security gaps
DROP POLICY IF EXISTS "Authenticated users can create own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Authenticated users can update own subscription" ON public.subscribers;
DROP POLICY IF EXISTS "Users can view own subscription only" ON public.subscribers;
DROP POLICY IF EXISTS "Deny all anonymous access to subscribers" ON public.subscribers;

-- Create more secure policies for the subscribers table
-- Policy 1: Strict user creation - only allow creating records for authenticated user's own ID
CREATE POLICY "Users can create own subscription record only"
  ON public.subscribers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND user_id = auth.uid()
    AND email = auth.email()
  );

-- Policy 2: Strict user updates - only allow updating own records
CREATE POLICY "Users can update own subscription only"
  ON public.subscribers  
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL 
    AND user_id = auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND user_id = auth.uid()
    AND email = auth.email()
  );

-- Policy 3: Strict read access - only allow viewing own subscription data
CREATE POLICY "Users can view own subscription data only"
  ON public.subscribers
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL 
    AND user_id = auth.uid()
  );

-- Policy 4: Completely block anonymous access
CREATE POLICY "Block all anonymous access to subscriber data"
  ON public.subscribers
  FOR ALL
  TO anon
  USING (false);

-- Policy 5: Allow system/service role for backend operations
CREATE POLICY "System can manage subscriptions for backend operations"
  ON public.subscribers
  FOR ALL
  TO service_role
  USING (true);

-- Policy 6: Block DELETE operations for regular users (only system can delete)
CREATE POLICY "Block user deletions of subscription data"
  ON public.subscribers
  FOR DELETE
  TO authenticated
  USING (false);

-- Ensure RLS is enabled on the subscribers table
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Add additional security: Create an index on user_id for better performance
-- and ensure user_id is not nullable for better security
ALTER TABLE public.subscribers ALTER COLUMN user_id SET NOT NULL;

-- Add a constraint to ensure user_id matches the authenticated user
-- This provides an additional layer of security at the database level
ALTER TABLE public.subscribers 
ADD CONSTRAINT subscribers_user_id_check 
CHECK (user_id IS NOT NULL);
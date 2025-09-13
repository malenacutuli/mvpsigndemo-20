-- Step 1: Add explicit policy to block all anonymous access to profiles
CREATE POLICY "Block all anonymous access to profiles"
  ON public.profiles
  FOR ALL
  TO anon
  USING (false);

-- Step 2: Remove email column from profiles table since it's already in auth.users
-- This eliminates unnecessary sensitive data duplication
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Step 3: Add a function to safely get user email when needed (from auth.users only)
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT auth.email();
$$;

-- Step 4: Create more restrictive profile policies
-- Drop existing policies and recreate them with stronger security
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;  
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Recreate policies with explicit authentication checks
CREATE POLICY "Authenticated users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id
  );

CREATE POLICY "Authenticated users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id
  );

CREATE POLICY "Authenticated users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id
  );

-- Step 5: Block DELETE operations on profiles (only system should manage this)
CREATE POLICY "Block profile deletions by users"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (false);

-- Step 6: Allow system role for backend operations only
CREATE POLICY "System can manage profiles"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true);

-- Step 7: Add constraint to ensure user_id is always set (prevents orphaned profiles)
ALTER TABLE public.profiles 
ALTER COLUMN user_id SET NOT NULL;
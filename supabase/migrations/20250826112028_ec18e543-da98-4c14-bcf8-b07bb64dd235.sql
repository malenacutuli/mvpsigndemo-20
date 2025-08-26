-- Improve profiles table security by making policies more explicit
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;  
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new, more secure and explicit policies
CREATE POLICY "Authenticated users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Explicitly block all anonymous access to profiles
CREATE POLICY "Block anonymous access to profiles" 
ON public.profiles 
FOR ALL 
TO anon
USING (FALSE);

-- Also ensure user_id cannot be NULL to prevent potential security issues
ALTER TABLE public.profiles 
ALTER COLUMN user_id SET NOT NULL;
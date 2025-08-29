-- Clean up and fix RLS policies for the profiles table

-- First, drop all existing policies on profiles table
DROP POLICY IF EXISTS "Authenticated users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profile except role" ON public.profiles;

-- Create clean, secure RLS policies for profiles table

-- Allow users to view only their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to insert their own profile (for signup)
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own profile (but not the role field)
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND OLD.role = NEW.role);

-- Explicitly deny all access to anonymous users (this is actually redundant since we only allow authenticated users above, but makes intent clear)
CREATE POLICY "Deny anonymous access" 
ON public.profiles 
FOR ALL 
TO anon
USING (false);

-- Ensure the user_id column is not nullable (security requirement)
-- This prevents users from creating profiles without a user_id
ALTER TABLE public.profiles 
ALTER COLUMN user_id SET NOT NULL;
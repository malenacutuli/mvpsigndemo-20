-- Fix critical security vulnerability in subscribers table RLS policies
-- Remove the overly permissive policy that allows unrestricted access

-- Drop the dangerous policy that allows unrestricted access
DROP POLICY IF EXISTS "System can manage subscriptions for backend operations" ON public.subscribers;

-- Ensure we have proper policies in place:
-- 1. Block anonymous access (already exists)
-- 2. System role can manage subscriptions (already exists) 
-- 3. Users can only access their own data (already exists)

-- Add a comment to document the security fix
COMMENT ON TABLE public.subscribers IS 'Customer subscription data - RLS policies updated to prevent unauthorized access to email addresses and payment data';
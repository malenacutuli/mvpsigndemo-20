-- Fix security issue: Restrict channel_subscriptions access to prevent email harvesting
-- Remove the overly permissive "Channel owners can view subscriber count only" policy
-- that allows full table access including email addresses

-- Drop the problematic policy that exposes subscriber emails
DROP POLICY IF EXISTS "Channel owners can view subscriber count only" ON public.channel_subscriptions;

-- Create a more restrictive policy that only allows channel owners to access 
-- their own subscription records through secure functions, not direct table access
-- This ensures aggregated data access only through the secure functions we have
CREATE POLICY "Channel owners can access aggregated stats only" 
ON public.channel_subscriptions 
FOR SELECT 
USING (
  -- Block direct table access for channel owners
  -- They should use the get_channel_subscriber_stats() and get_channel_stats() functions instead
  false
);

-- Allow system service role to manage subscriptions (needed for the secure functions)
-- This policy already exists but ensuring it's in place
-- "System can manage subscriptions" policy should remain

-- The "Users can view own subscription status" policy is fine as it only 
-- allows users to see their own subscription, not others' emails

-- Note: Channel owners should use these secure functions instead:
-- - get_channel_subscriber_stats(channel_uuid) for detailed stats
-- - get_channel_stats(channel_uuid) for basic stats
-- These functions return only aggregated data without exposing individual emails
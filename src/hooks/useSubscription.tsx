import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  features?: {
    storage_gb: number;
    videos_per_month: number;
  };
}

interface SubscriptionContextType extends SubscriptionData {
  loading: boolean;
  checkSubscription: () => Promise<void>;
  createCheckout: (plan: string) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({
    subscribed: false,
    subscription_tier: null,
    subscription_end: null,
    features: { storage_gb: 1, videos_per_month: 1 },
  });
  const [loading, setLoading] = useState(false);

  const checkSubscription = async () => {
    if (!user || !session) {
      setSubscriptionData({
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        features: { storage_gb: 1, videos_per_month: 1 },
      });
      return;
    }

    setLoading(true);
    try {
      // Use the secure edge function
      const { data, error } = await supabase.functions.invoke('get-subscription-info', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setSubscriptionData({
        subscribed: data.subscribed || false,
        subscription_tier: data.subscription_tier || null,
        subscription_end: data.subscription_end || null,
        features: data.features || { storage_gb: 1, videos_per_month: 1 },
      });
    } catch (error) {
      console.error('Failed to check subscription:', error);
      // Set secure defaults on error
      setSubscriptionData({
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        features: { storage_gb: 1, videos_per_month: 1 },
      });
      toast({
        title: "Error",
        description: "Failed to check subscription status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCheckout = async (plan: string) => {
    if (!user || !session) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to continue",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      // Redirect to Stripe checkout in the same tab (popup blockers won't interfere)
      window.location.href = data.url;
    } catch (error) {
      console.error('Failed to create checkout:', error);
      toast({
        title: "Error",
        description: "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    if (!user || !session) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to continue",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      // Redirect to Stripe customer portal in the same tab
      window.location.href = data.url;
    } catch (error) {
      console.error('Failed to open customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open customer portal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Check subscription on user login
  useEffect(() => {
    if (user && session) {
      checkSubscription();
    } else {
      setSubscriptionData({
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        features: { storage_gb: 1, videos_per_month: 1 },
      });
    }
  }, [user, session]);

  const value: SubscriptionContextType = {
    ...subscriptionData,
    loading,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
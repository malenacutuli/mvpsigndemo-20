import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function usePremiumAccess() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['premiumAccess', user?.id],
    queryFn: async () => {
      if (!user) return { canAccess: false, tier: 'none' };

      const { data: subscriber } = await supabase
        .from('subscribers')
        .select('subscription_tier')
        .eq('user_id', user.id)
        .single();

      const tier = subscriber?.subscription_tier?.toLowerCase() || 'free';
      const premiumTiers = ['standard', 'advanced', 'enterprise'];
      
      return {
        canAccess: premiumTiers.includes(tier),
        tier: tier
      };
    },
    enabled: !!user
  });

  return {
    canAccess: data?.canAccess || false,
    tier: data?.tier || 'none',
    isLoading
  };
}

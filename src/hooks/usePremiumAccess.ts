import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function usePremiumAccess() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['premiumAccess', user?.id],
    queryFn: async () => {
      if (!user) return { canAccess: false, tier: 'none', isAdmin: false };

      // Check if user has admin role
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      // Admins always have access
      if (adminRole) {
        return {
          canAccess: true,
          tier: 'admin',
          isAdmin: true
        };
      }

      // Check subscription tier
      const { data: subscriber } = await supabase
        .from('subscribers')
        .select('subscription_tier')
        .eq('user_id', user.id)
        .maybeSingle();

      const tier = subscriber?.subscription_tier?.toLowerCase() || 'free';
      const premiumTiers = ['standard', 'advanced', 'enterprise'];
      
      return {
        canAccess: premiumTiers.includes(tier),
        tier: tier,
        isAdmin: false
      };
    },
    enabled: !!user
  });

  return {
    canAccess: data?.canAccess || false,
    tier: data?.tier || 'none',
    isAdmin: data?.isAdmin || false,
    isLoading
  };
}

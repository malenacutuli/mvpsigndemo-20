import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AIFeaturesStatus {
  isReady: boolean;
  isChecking: boolean;
  error: string | null;
}

export function useAIFeaturesStatus(): AIFeaturesStatus {
  const [status, setStatus] = useState<AIFeaturesStatus>({
    isReady: false,
    isChecking: true,
    error: null,
  });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Try to call the health check endpoint
        const { data, error } = await supabase.functions.invoke('premium-ai-health', {
          method: 'GET'
        });

        if (error) {
          // If 404, functions not deployed yet
          if (error.message?.includes('404') || error.message?.includes('not found')) {
            setStatus({
              isReady: false,
              isChecking: false,
              error: 'AI features are deploying. Please wait a moment and refresh the page.',
            });
          } else {
            setStatus({
              isReady: false,
              isChecking: false,
              error: 'Unable to verify AI features status',
            });
          }
        } else if (data?.status === 'ok') {
          setStatus({
            isReady: true,
            isChecking: false,
            error: null,
          });
        } else {
          setStatus({
            isReady: false,
            isChecking: false,
            error: 'AI features unavailable',
          });
        }
      } catch (error) {
        console.error('Failed to check AI features status:', error);
        setStatus({
          isReady: false,
          isChecking: false,
          error: 'Unable to verify AI features status',
        });
      }
    };

    checkStatus();

    // Check again after 10 seconds if not ready (to catch deployments)
    const retryTimer = setTimeout(() => {
      if (!status.isReady) {
        checkStatus();
      }
    }, 10000);

    return () => clearTimeout(retryTimer);
  }, []);

  return status;
}

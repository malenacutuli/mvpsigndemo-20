import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePremiumAccess } from '@/hooks/usePremiumAccess';
import { SubscriptionGate } from '@/components/premium-editor/SubscriptionGate';
import { LoadingScreen } from '@/components/premium-editor/LoadingScreen';
import { AxessibleEditor } from '@/components/axessible-editor/AxessibleEditor';

export default function PremiumVideoEditor() {
  const { id: videoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canAccess, tier, isLoading: accessLoading } = usePremiumAccess();

  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to exit editor
      if (e.key === 'Escape') {
        navigate(`/video/${videoId}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videoId, navigate]);

  // Handle missing videoId
  if (!videoId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Video Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The requested video could not be found.
          </p>
          <Button onClick={() => navigate('/videos')}>
            Back to Videos
          </Button>
        </Card>
      </div>
    );
  }

  // Loading state (subscription/access check)
  if (accessLoading) {
    return <LoadingScreen message="Checking your subscription access..." />;
  }

  // Show subscription gate for insufficient tier
  if (!canAccess) {
    toast.error('Premium Editor requires Standard plan or higher', {
      description: 'Upgrade your plan to access MediaBunny-powered editing',
      duration: 5000
    });
    return <SubscriptionGate currentTier={tier || 'Free'} videoId={videoId} />;
  }

  // Render the Axessible Editor with MediaBunny integration
  return <AxessibleEditor videoId={videoId} />;
}

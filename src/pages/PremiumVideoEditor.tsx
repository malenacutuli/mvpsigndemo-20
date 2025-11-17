import { useParams, Navigate } from 'react-router-dom';
import { usePremiumAccess } from '@/hooks/usePremiumAccess';
import { PremiumEditorLayout } from '@/components/premium-editor/PremiumEditorLayout';
import { SubscriptionGate } from '@/components/premium-editor/SubscriptionGate';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function PremiumVideoEditor() {
  const { id: videoId } = useParams<{ id: string }>();
  const { canAccess, isLoading, tier } = usePremiumAccess();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md p-6 space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </Card>
      </div>
    );
  }

  if (!videoId) {
    return <Navigate to="/dashboard" />;
  }

  if (!canAccess) {
    return <SubscriptionGate currentTier={tier} videoId={videoId} />;
  }

  return <PremiumEditorLayout videoId={videoId} />;
}

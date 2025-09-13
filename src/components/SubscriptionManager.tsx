import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { Calendar, CreditCard, RefreshCw } from 'lucide-react';

export const SubscriptionManager: React.FC = () => {
  const { 
    subscribed, 
    subscription_tier, 
    subscription_end, 
    loading, 
    checkSubscription, 
    openCustomerPortal 
  } = useSubscription();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = () => {
    if (!subscribed) return 'destructive';
    return 'default';
  };

  const getStatusText = () => {
    if (!subscribed) return 'No Active Subscription';
    return 'Active Subscription';
  };

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-center justify-between min-w-0">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Subscription Status</span>
            </CardTitle>
            <CardDescription className="text-sm truncate">
              Manage your Axessible subscription
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkSubscription}
            disabled={loading}
            className="flex-shrink-0 ml-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between min-w-0">
          <span className="text-sm font-medium flex-shrink-0">Status:</span>
          <Badge variant={getStatusColor()} className="ml-2 text-xs">
            <span className="truncate">{getStatusText()}</span>
          </Badge>
        </div>

        {subscribed && subscription_tier && (
          <div className="flex items-center justify-between min-w-0">
            <span className="text-sm font-medium flex-shrink-0">Plan:</span>
            <Badge variant="outline" className="ml-2 text-xs">
              <span className="truncate">{subscription_tier}</span>
            </Badge>
          </div>
        )}

        {subscription_end && (
          <div className="flex items-center justify-between min-w-0">
            <span className="text-sm font-medium flex-shrink-0">Next Billing:</span>
            <div className="flex items-center gap-1 text-xs ml-2 min-w-0">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{formatDate(subscription_end)}</span>
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          {subscribed ? (
            <Button 
              onClick={openCustomerPortal}
              disabled={loading}
              className="w-full"
            >
              Manage Subscription
            </Button>
          ) : (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                You don't have an active subscription
              </p>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/pricing'}
                className="w-full"
              >
                View Plans
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Subscription Status
            </CardTitle>
            <CardDescription>
              Manage your Axessible subscription
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkSubscription}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge variant={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </div>

        {subscribed && subscription_tier && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Plan:</span>
            <Badge variant="outline">
              {subscription_tier}
            </Badge>
          </div>
        )}

        {subscription_end && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Next Billing:</span>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4" />
              {formatDate(subscription_end)}
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
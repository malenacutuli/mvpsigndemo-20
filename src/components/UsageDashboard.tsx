import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, Database, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UsageSummary {
  billingCycle: {
    start: string;
    end: string | null;
  };
  usage: {
    minutesUsed: number;
    minutesIncluded: number;
    minutesRemaining: number;
    storageUsedGB: number;
    storageLimitGB: number;
    storageRemainingGB: number;
  };
  costs: {
    overageMinutes: number;
    overageCostEUR: number;
    overageRateEUR: number;
  };
  tier: string;
  breakdown: Array<{
    type: string;
    count: number;
    minutes: number;
    estimatedCost: number;
  }>;
  approachingLimit?: boolean;
}

export const UsageDashboard: React.FC = () => {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-usage-summary');
      
      if (error) throw error;
      
      setUsage(data);
    } catch (error) {
      console.error('Error fetching usage:', error);
      toast({
        title: "Error",
        description: "Failed to load usage data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Usage Dashboard
          </CardTitle>
          <CardDescription>Loading your usage data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 bg-gray-200 animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usage) return null;

  const minutesPercent = usage.usage.minutesIncluded > 0
    ? Math.min((usage.usage.minutesUsed / usage.usage.minutesIncluded) * 100, 100)
    : 0;

  const storagePercent = usage.usage.storageLimitGB > 0
    ? Math.min((usage.usage.storageUsedGB / usage.usage.storageLimitGB) * 100, 100)
    : 0;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Usage Dashboard
            </CardTitle>
            <CardDescription>
              Current billing cycle: {formatDate(usage.billingCycle.start)} 
              {usage.billingCycle.end && ` - ${formatDate(usage.billingCycle.end)}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {usage.tier} Plan
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchUsage}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Warning for approaching limit */}
        {usage.approachingLimit && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-900">Approaching Usage Limit</p>
              <p className="text-amber-700">
                You've used {Math.round(minutesPercent)}% of your included processing minutes. 
                Consider upgrading your plan to avoid overage charges.
              </p>
            </div>
          </div>
        )}

        {/* Processing Minutes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Processing Minutes</span>
            </div>
            <span className="text-muted-foreground">
              {usage.usage.minutesUsed} / {usage.usage.minutesIncluded} min
            </span>
          </div>
          <Progress value={minutesPercent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{usage.usage.minutesRemaining} minutes remaining</span>
            {usage.costs.overageMinutes > 0 && (
              <span className="text-destructive font-medium">
                +{usage.costs.overageMinutes} min overage (€{usage.costs.overageCostEUR.toFixed(2)})
              </span>
            )}
          </div>
        </div>

        {/* Storage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Storage</span>
            </div>
            <span className="text-muted-foreground">
              {usage.usage.storageUsedGB.toFixed(1)} / {usage.usage.storageLimitGB} GB
            </span>
          </div>
          <Progress value={storagePercent} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {usage.usage.storageRemainingGB.toFixed(1)} GB remaining
          </div>
        </div>

        {/* Usage Breakdown */}
        {usage.breakdown.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-sm font-medium">Usage Breakdown</h4>
            <div className="space-y-2">
              {usage.breakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex-1">
                    <span className="text-muted-foreground capitalize">
                      {item.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({item.count} calls)
                    </span>
                  </div>
                  <div className="text-right">
                    <div>{item.minutes.toFixed(1)} min</div>
                    {item.estimatedCost > 0 && (
                      <div className="text-xs text-muted-foreground">
                        €{item.estimatedCost.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overage Info */}
        {usage.costs.overageRateEUR > 0 && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Overage rate: €{usage.costs.overageRateEUR.toFixed(2)} per minute beyond included quota
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TierUsageData {
  date: string;
  free_minutes: number;
  pro_minutes: number;
  enterprise_minutes: number;
  free_storage: number;
  pro_storage: number;
  enterprise_storage: number;
}

export function UsageDashboard() {
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<TierUsageData[]>([]);
  const [summary, setSummary] = useState({
    totalSubscribers: 0,
    totalMinutesUsed: 0,
    totalStorageUsed: 0,
    byTier: {
      free: { count: 0, minutes: 0, storage: 0 },
      pro: { count: 0, minutes: 0, storage: 0 },
      enterprise: { count: 0, minutes: 0, storage: 0 },
    }
  });

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    try {
      setLoading(true);

      // Fetch current subscribers data
      const { data: subscribers, error } = await supabase
        .from('subscribers')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!subscribers) {
        setUsageData([]);
        return;
      }

      // Calculate summary
      const tierCounts = { free: 0, pro: 0, enterprise: 0 };
      const tierMinutes = { free: 0, pro: 0, enterprise: 0 };
      const tierStorage = { free: 0, pro: 0, enterprise: 0 };

      subscribers.forEach((sub) => {
        const tier = sub.subscription_tier || 'free';
        const tierKey = tier.toLowerCase() as keyof typeof tierCounts;
        
        if (tierKey in tierCounts) {
          tierCounts[tierKey]++;
          tierMinutes[tierKey] += Number(sub.minutes_used) || 0;
          tierStorage[tierKey] += Number(sub.storage_used_gb) || 0;
        }
      });

      setSummary({
        totalSubscribers: subscribers.length,
        totalMinutesUsed: Object.values(tierMinutes).reduce((a, b) => a + b, 0),
        totalStorageUsed: Object.values(tierStorage).reduce((a, b) => a + b, 0),
        byTier: {
          free: { count: tierCounts.free, minutes: tierMinutes.free, storage: tierStorage.free },
          pro: { count: tierCounts.pro, minutes: tierMinutes.pro, storage: tierStorage.pro },
          enterprise: { count: tierCounts.enterprise, minutes: tierMinutes.enterprise, storage: tierStorage.enterprise },
        }
      });

      // Generate time-series data (last 30 days)
      const now = new Date();
      const timeSeriesData: TierUsageData[] = [];

      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // Filter subscribers active on this date
        const activeOnDate = subscribers.filter(sub => {
          const createdAt = new Date(sub.created_at);
          return createdAt <= date;
        });

        const dayData: TierUsageData = {
          date: dateStr,
          free_minutes: 0,
          pro_minutes: 0,
          enterprise_minutes: 0,
          free_storage: 0,
          pro_storage: 0,
          enterprise_storage: 0,
        };

        activeOnDate.forEach(sub => {
          const tier = (sub.subscription_tier || 'free').toLowerCase();
          const minutes = Number(sub.minutes_used) || 0;
          const storage = Number(sub.storage_used_gb) || 0;

          if (tier === 'free') {
            dayData.free_minutes += minutes;
            dayData.free_storage += storage;
          } else if (tier === 'pro') {
            dayData.pro_minutes += minutes;
            dayData.pro_storage += storage;
          } else if (tier === 'enterprise') {
            dayData.enterprise_minutes += minutes;
            dayData.enterprise_storage += storage;
          }
        });

        timeSeriesData.push(dayData);
      }

      setUsageData(timeSeriesData);

    } catch (error: any) {
      console.error('Error fetching usage data:', error);
      toast.error('Failed to load usage analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const chartConfig = {
    free_minutes: {
      label: "Free Tier",
      color: "hsl(var(--chart-1))",
    },
    pro_minutes: {
      label: "Pro Tier",
      color: "hsl(var(--chart-2))",
    },
    enterprise_minutes: {
      label: "Enterprise Tier",
      color: "hsl(var(--chart-3))",
    },
  };

  const storageChartConfig = {
    free_storage: {
      label: "Free Tier",
      color: "hsl(var(--chart-1))",
    },
    pro_storage: {
      label: "Pro Tier",
      color: "hsl(var(--chart-2))",
    },
    enterprise_storage: {
      label: "Enterprise Tier",
      color: "hsl(var(--chart-3))",
    },
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Subscribers</CardDescription>
            <CardTitle className="text-3xl">{summary.totalSubscribers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Minutes Used</CardDescription>
            <CardTitle className="text-3xl">{summary.totalMinutesUsed.toFixed(0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Storage (GB)</CardDescription>
            <CardTitle className="text-3xl">{summary.totalStorageUsed.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pro Subscribers</CardDescription>
            <CardTitle className="text-3xl">{summary.byTier.pro.count}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tier Breakdown */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Free Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Subscribers</span>
                <span className="font-medium">{summary.byTier.free.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Minutes Used</span>
                <span className="font-medium">{summary.byTier.free.minutes.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Storage (GB)</span>
                <span className="font-medium">{summary.byTier.free.storage.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pro Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Subscribers</span>
                <span className="font-medium">{summary.byTier.pro.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Minutes Used</span>
                <span className="font-medium">{summary.byTier.pro.minutes.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Storage (GB)</span>
                <span className="font-medium">{summary.byTier.pro.storage.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enterprise Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Subscribers</span>
                <span className="font-medium">{summary.byTier.enterprise.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Minutes Used</span>
                <span className="font-medium">{summary.byTier.enterprise.minutes.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Storage (GB)</span>
                <span className="font-medium">{summary.byTier.enterprise.storage.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Minutes Consumed Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Minutes Consumed by Tier (Last 30 Days)</CardTitle>
          <CardDescription>Cumulative processing minutes across all subscription tiers</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line type="monotone" dataKey="free_minutes" stroke="var(--color-free_minutes)" name="Free Tier" strokeWidth={2} />
                <Line type="monotone" dataKey="pro_minutes" stroke="var(--color-pro_minutes)" name="Pro Tier" strokeWidth={2} />
                <Line type="monotone" dataKey="enterprise_minutes" stroke="var(--color-enterprise_minutes)" name="Enterprise Tier" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Storage Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Growth by Tier (Last 30 Days)</CardTitle>
          <CardDescription>Cumulative storage consumption in gigabytes</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={storageChartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="free_storage" fill="var(--color-free_storage)" name="Free Tier" />
                <Bar dataKey="pro_storage" fill="var(--color-pro_storage)" name="Pro Tier" />
                <Bar dataKey="enterprise_storage" fill="var(--color-enterprise_storage)" name="Enterprise Tier" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

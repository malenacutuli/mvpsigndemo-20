import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, TrendingUp, HardDrive, Clock, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { UsageAlertsPanel } from "@/components/UsageAlertsPanel";
import { UserAlertHistory } from "@/components/UserAlertHistory";

interface SubscriberStats {
  total_subscribers: number;
  active_subscribers: number;
  free_tier_count: number;
  starter_tier_count: number;
  standard_tier_count: number;
  advanced_tier_count: number;
  total_storage_used_gb: number;
  total_minutes_used: number;
}

interface Subscriber {
  user_id: string;
  display_name: string;
  subscription_tier: string;
  is_active: boolean;
  subscription_end: string | null;
  minutes_used: number;
  minutes_included: number;
  storage_used_gb: number;
  storage_limit_gb: number;
  created_at: string;
}

export default function AdminSubscribers() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SubscriberStats | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in to view this page');
        return;
      }

      const response = await fetch(
        'https://faeyekynudyzeotbjfsj.supabase.co/functions/v1/admin-subscribers',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'stats' }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch subscriber statistics');
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriberList = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in to view this page');
        return;
      }

      const response = await fetch(
        'https://faeyekynudyzeotbjfsj.supabase.co/functions/v1/admin-subscribers',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'list' }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch subscriber list');
      }

      const data = await response.json();
      setSubscribers(data.subscribers || []);
      setShowList(true);
    } catch (err) {
      console.error('Error fetching subscriber list:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'advanced': return 'default';
      case 'standard': return 'secondary';
      case 'starter': return 'outline';
      default: return 'outline';
    }
  };

  const refreshData = async () => {
    await fetchStats();
    if (showList) {
      await fetchSubscriberList();
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            You must be logged in to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscriber Dashboard</h1>
          <p className="text-muted-foreground">Overview of your platform subscribers</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Usage Alerts Panel */}
      <UsageAlertsPanel onRefresh={refreshData} />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.total_subscribers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.active_subscribers || 0} active
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">By Tier</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="space-y-1">
                <div className="text-sm">
                  <span className="font-medium">Advanced:</span> {stats?.advanced_tier_count || 0}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Standard:</span> {stats?.standard_tier_count || 0}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Starter:</span> {stats?.starter_tier_count || 0}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {(stats?.total_storage_used_gb || 0).toFixed(2)} GB
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Minutes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.total_minutes_used || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subscriber List */}
      <Card>
        <CardHeader>
          <CardTitle>Subscriber List</CardTitle>
          <CardDescription>
            View detailed information about your subscribers (no emails or payment data exposed)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showList ? (
            <div className="text-center py-8">
              <button
                onClick={fetchSubscriberList}
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load Subscriber List'}
              </button>
            </div>
          ) : loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : subscribers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No subscribers found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map((sub) => (
                  <>
                    <TableRow key={sub.user_id}>
                      <TableCell className="font-medium">{sub.display_name}</TableCell>
                      <TableCell>
                        <Badge variant={getTierColor(sub.subscription_tier)}>
                          {sub.subscription_tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sub.is_active ? "default" : "secondary"}>
                          {sub.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {sub.minutes_used} / {sub.minutes_included} min
                      </TableCell>
                      <TableCell className="text-sm">
                        {sub.storage_used_gb.toFixed(2)} / {sub.storage_limit_gb} GB
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(sub.created_at), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                    <TableRow key={`${sub.user_id}-alert-history`}>
                      <TableCell colSpan={6} className="p-0 bg-muted/50">
                        <UserAlertHistory userId={sub.user_id} />
                      </TableCell>
                    </TableRow>
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

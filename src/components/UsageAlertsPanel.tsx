import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Bell, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface UsageNotification {
  id: string;
  user_id: string;
  notification_type: string;
  sent_at: string;
  usage_snapshot: {
    minutes_used?: number;
    minutes_included?: number;
    storage_used_gb?: number;
    storage_limit_gb?: number;
  };
  billing_cycle_start: string;
}

interface UsageAlertsPanelProps {
  onRefresh?: () => void;
}

export function UsageAlertsPanel({ onRefresh }: UsageAlertsPanelProps) {
  const [notifications, setNotifications] = useState<UsageNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usage_notifications')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications((data || []) as UsageNotification[]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notification history');
    } finally {
      setLoading(false);
    }
  };

  const checkAlertsNow = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-usage-alerts', {
        body: {}
      });

      if (error) throw error;

      toast.success(`Alert check completed! ${data.notificationsSent || 0} notifications sent`);
      
      // Refresh notifications and subscriber list
      await fetchNotifications();
      onRefresh?.();
    } catch (error: any) {
      console.error('Error checking alerts:', error);
      toast.error(error.message || 'Failed to check alerts');
    } finally {
      setChecking(false);
    }
  };

  const getNotificationTypeBadge = (type: string) => {
    switch (type) {
      case 'minutes_warning':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />80% Minutes</Badge>;
      case 'storage_warning':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />80% Storage</Badge>;
      case 'minutes_overage':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Minutes Overage</Badge>;
      case 'storage_overage':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Storage Overage</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Usage Alerts & Notifications
            </CardTitle>
            <CardDescription>
              Monitor and manage usage notifications for all subscribers
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchNotifications}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
            </Button>
            <Button
              onClick={checkAlertsNow}
              disabled={checking}
              variant="professional"
            >
              {checking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Check Alerts Now
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 && !loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No notifications sent yet</p>
            <p className="text-sm">Click "Check Alerts Now" to scan for users approaching limits</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Usage Details</TableHead>
                  <TableHead>Billing Cycle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : (
                  notifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(notification.sent_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {getNotificationTypeBadge(notification.notification_type)}
                      </TableCell>
                      <TableCell>
                        {notification.notification_type.includes('minutes') && (
                          <span className="text-sm">
                            {notification.usage_snapshot.minutes_used?.toFixed(0) || 0} / {notification.usage_snapshot.minutes_included || 0} minutes
                          </span>
                        )}
                        {notification.notification_type.includes('storage') && (
                          <span className="text-sm">
                            {notification.usage_snapshot.storage_used_gb?.toFixed(2) || 0} / {notification.usage_snapshot.storage_limit_gb || 0} GB
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(notification.billing_cycle_start), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

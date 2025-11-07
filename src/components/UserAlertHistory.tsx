import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface UserAlertHistoryProps {
  userId: string;
}

interface NotificationHistory {
  id: string;
  notification_type: string;
  sent_at: string;
  usage_snapshot: {
    minutes_used?: number;
    minutes_included?: number;
    storage_used_gb?: number;
    storage_limit_gb?: number;
  };
}

export function UserAlertHistory({ userId }: UserAlertHistoryProps) {
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (expanded && history.length === 0) {
      fetchHistory();
    }
  }, [expanded]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usage_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory((data || []) as NotificationHistory[]);
    } catch (error) {
      console.error('Error fetching user alert history:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="w-full justify-start"
      >
        {expanded ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
        <History className="w-4 h-4 mr-2" />
        Alert History ({history.length})
      </Button>
      
      {expanded && (
        <div className="mt-2 ml-6 space-y-2">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading history...
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No alerts sent to this user</p>
          ) : (
            history.map((record) => (
              <div key={record.id} className="text-sm border-l-2 border-border pl-3 py-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={record.notification_type.includes('overage') ? 'destructive' : 'secondary'}>
                    {record.notification_type.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(record.sent_at), 'MMM d, HH:mm')}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {record.notification_type.includes('minutes') && (
                    <span>
                      {record.usage_snapshot.minutes_used?.toFixed(0)} / {record.usage_snapshot.minutes_included} minutes
                    </span>
                  )}
                  {record.notification_type.includes('storage') && (
                    <span>
                      {record.usage_snapshot.storage_used_gb?.toFixed(2)} / {record.usage_snapshot.storage_limit_gb} GB
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

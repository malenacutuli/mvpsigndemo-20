import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserUsage {
  user_id: string;
  email: string;
  minutes_used: number;
  minutes_included: number;
  minutes_percent: number;
  storage_used_gb: number;
  storage_limit_gb: number;
  storage_percent: number;
  tier: string;
  billing_cycle_start: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("Starting usage alerts check...");

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users approaching limits (>=80%)
    const { data: usersAtRisk, error: usersError } = await supabase
      .rpc('get_users_approaching_limits');

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    console.log(`Found ${usersAtRisk?.length || 0} users with usage concerns`);

    let notifiedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Process each user
    for (const user of (usersAtRisk || []) as UserUsage[]) {
      try {
        // Determine notification types needed
        const notificationsNeeded: string[] = [];

        // Check minutes usage
        if (user.minutes_used > user.minutes_included) {
          notificationsNeeded.push('overage_minutes');
        } else if (user.minutes_percent >= 80) {
          notificationsNeeded.push('warning_minutes_80');
        }

        // Check storage usage
        if (user.storage_used_gb > user.storage_limit_gb) {
          notificationsNeeded.push('overage_storage');
        } else if (user.storage_percent >= 80) {
          notificationsNeeded.push('warning_storage_80');
        }

        // Send notifications for each type
        for (const notifType of notificationsNeeded) {
          // Check if notification should be sent
          const { data: shouldSend, error: checkError } = await supabase
            .rpc('should_send_notification', {
              target_user_id: user.user_id,
              notif_type: notifType
            });

          if (checkError) {
            console.error(`Error checking notification status for ${user.email}:`, checkError);
            errors.push(`${user.email}: ${checkError.message}`);
            continue;
          }

          if (!shouldSend) {
            console.log(`Skipping ${notifType} for ${user.email} (already sent recently)`);
            skippedCount++;
            continue;
          }

          // Send notification via edge function
          console.log(`Sending ${notifType} to ${user.email}...`);
          
          const { error: sendError } = await supabase.functions.invoke('send-usage-warning', {
            body: {
              userId: user.user_id,
              email: user.email,
              notificationType: notifType,
              usageData: {
                minutes_used: user.minutes_used,
                minutes_included: user.minutes_included,
                minutes_percent: user.minutes_percent,
                storage_used_gb: user.storage_used_gb,
                storage_limit_gb: user.storage_limit_gb,
                storage_percent: user.storage_percent,
                tier: user.tier,
                billing_cycle_start: user.billing_cycle_start
              }
            }
          });

          if (sendError) {
            console.error(`Failed to send ${notifType} to ${user.email}:`, sendError);
            errors.push(`${user.email}: ${sendError.message}`);
          } else {
            console.log(`✓ Sent ${notifType} to ${user.email}`);
            notifiedCount++;
          }
        }

      } catch (userError: any) {
        console.error(`Error processing user ${user.email}:`, userError);
        errors.push(`${user.email}: ${userError.message}`);
      }
    }

    const duration = Date.now() - startTime;

    const summary = {
      success: true,
      duration_ms: duration,
      users_checked: usersAtRisk?.length || 0,
      notifications_sent: notifiedCount,
      notifications_skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    };

    console.log("Usage alerts check completed:", summary);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Critical error in usage alerts check:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

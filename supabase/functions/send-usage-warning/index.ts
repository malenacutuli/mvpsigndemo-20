import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UsageWarningRequest {
  userId: string;
  email: string;
  notificationType: 'warning_minutes_80' | 'warning_storage_80' | 'overage_minutes' | 'overage_storage';
  usageData: {
    minutes_used: number;
    minutes_included: number;
    minutes_percent: number;
    storage_used_gb: number;
    storage_limit_gb: number;
    storage_percent: number;
    tier: string;
    billing_cycle_start: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, notificationType, usageData }: UsageWarningRequest = await req.json();

    console.log(`Sending ${notificationType} notification to ${email}`);

    // Generate email content based on notification type
    const emailContent = generateEmailContent(notificationType, usageData);

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Axessible Billing <billing@axessible.ai>",
      to: [email],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log("Email sent successfully:", emailResponse);

    // Record notification in database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: notificationId, error: dbError } = await supabase
      .rpc('record_notification_sent', {
        target_user_id: userId,
        notif_type: notificationType,
        usage_data: usageData
      });

    if (dbError) {
      console.error("Failed to record notification:", dbError);
      // Don't fail the request if recording fails
    } else {
      console.log(`Notification recorded with ID: ${notificationId}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      notificationId 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error sending usage warning:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function generateEmailContent(
  type: string,
  usage: UsageWarningRequest['usageData']
): { subject: string; html: string } {
  const cycleEnd = new Date(usage.billing_cycle_start);
  cycleEnd.setMonth(cycleEnd.getMonth() + 1);
  const cycleEndStr = cycleEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const overageRate = usage.tier === 'starter' ? 11.90 : usage.tier === 'standard' ? 8.99 : 5.99;

  switch (type) {
    case 'warning_minutes_80':
      return {
        subject: "⚠️ You've used 80% of your processing minutes",
        html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .usage-box { background: white; border: 2px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .metric { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: #f3f4f6; border-radius: 4px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">⚠️ Usage Alert</h1>
    <p style="margin: 10px 0 0;">You're approaching your monthly limit</p>
  </div>
  <div class="content">
    <h2>Hello,</h2>
    <p>You've used <strong>${usage.minutes_percent}%</strong> of your processing minutes this billing cycle.</p>
    
    <div class="usage-box">
      <h3 style="margin-top: 0; color: #f59e0b;">Current Usage</h3>
      <div class="metric">
        <span><strong>Processing Minutes:</strong></span>
        <span>${usage.minutes_used} / ${usage.minutes_included} (${usage.minutes_percent.toFixed(1)}%)</span>
      </div>
      <div class="metric">
        <span><strong>Storage:</strong></span>
        <span>${usage.storage_used_gb.toFixed(1)} / ${usage.storage_limit_gb} GB (${usage.storage_percent.toFixed(1)}%)</span>
      </div>
      <div class="metric">
        <span><strong>Current Plan:</strong></span>
        <span>${usage.tier.charAt(0).toUpperCase() + usage.tier.slice(1)}</span>
      </div>
    </div>

    <h3>What happens next?</h3>
    <ul>
      <li>If you exceed your included minutes, overage charges will apply at <strong>€${overageRate}/minute</strong></li>
      <li>Your billing cycle resets on <strong>${cycleEndStr}</strong></li>
      <li>You currently have <strong>${usage.minutes_included - usage.minutes_used} minutes</strong> remaining</li>
    </ul>

    <h3>Recommendations:</h3>
    <ul>
      <li>Consider upgrading to a higher tier plan to avoid overage charges</li>
      <li>Monitor your usage dashboard regularly</li>
      <li>Optimize your processing workflow to reduce minutes used</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://axessible.ai/pricing" class="button">Upgrade Plan</a>
      <a href="https://axessible.ai/dashboard" class="button" style="background: #6b7280;">View Dashboard</a>
    </div>

    <div class="footer">
      <p>Need help? Contact us at <a href="mailto:support@axessible.ai">support@axessible.ai</a></p>
      <p style="font-size: 12px;">You're receiving this because you're approaching your usage limits. This helps you avoid unexpected charges.</p>
    </div>
  </div>
</body>
</html>
        `
      };

    case 'warning_storage_80':
      return {
        subject: "⚠️ You've used 80% of your storage",
        html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .usage-box { background: white; border: 2px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .metric { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: #f3f4f6; border-radius: 4px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">⚠️ Storage Alert</h1>
    <p style="margin: 10px 0 0;">You're running low on storage space</p>
  </div>
  <div class="content">
    <h2>Hello,</h2>
    <p>You've used <strong>${usage.storage_percent.toFixed(1)}%</strong> of your storage limit.</p>
    
    <div class="usage-box">
      <h3 style="margin-top: 0; color: #f59e0b;">Current Usage</h3>
      <div class="metric">
        <span><strong>Storage Used:</strong></span>
        <span>${usage.storage_used_gb.toFixed(1)} / ${usage.storage_limit_gb} GB (${usage.storage_percent.toFixed(1)}%)</span>
      </div>
      <div class="metric">
        <span><strong>Storage Remaining:</strong></span>
        <span>${(usage.storage_limit_gb - usage.storage_used_gb).toFixed(1)} GB</span>
      </div>
      <div class="metric">
        <span><strong>Current Plan:</strong></span>
        <span>${usage.tier.charAt(0).toUpperCase() + usage.tier.slice(1)}</span>
      </div>
    </div>

    <h3>What this means:</h3>
    <ul>
      <li>You may not be able to upload new videos soon</li>
      <li>Consider deleting unused videos to free up space</li>
      <li>Or upgrade to a plan with more storage</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://axessible.ai/pricing" class="button">Upgrade Plan</a>
      <a href="https://axessible.ai/videos" class="button" style="background: #6b7280;">Manage Videos</a>
    </div>

    <div class="footer">
      <p>Need help? Contact us at <a href="mailto:support@axessible.ai">support@axessible.ai</a></p>
    </div>
  </div>
</body>
</html>
        `
      };

    case 'overage_minutes':
      const overageMinutes = usage.minutes_used - usage.minutes_included;
      const overageCost = overageMinutes * overageRate;
      return {
        subject: "🚨 Important: You've exceeded your plan limits",
        html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .overage-box { background: white; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .metric { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: #f3f4f6; border-radius: 4px; }
    .cost-highlight { background: #fee2e2; border: 2px solid #ef4444; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">🚨 Overage Alert</h1>
    <p style="margin: 10px 0 0;">You've exceeded your included minutes</p>
  </div>
  <div class="content">
    <h2>Hello,</h2>
    <p>You've exceeded your included processing minutes. <strong>Overage charges will apply.</strong></p>
    
    <div class="overage-box">
      <h3 style="margin-top: 0; color: #ef4444;">Overage Details</h3>
      <div class="metric">
        <span><strong>Minutes Used:</strong></span>
        <span>${usage.minutes_used} / ${usage.minutes_included}</span>
      </div>
      <div class="metric">
        <span><strong>Minutes Over Limit:</strong></span>
        <span style="color: #ef4444; font-weight: bold;">${overageMinutes} minutes</span>
      </div>
      <div class="metric">
        <span><strong>Overage Rate:</strong></span>
        <span>€${overageRate}/minute</span>
      </div>
    </div>

    <div class="cost-highlight">
      <h3 style="margin: 0 0 10px; color: #ef4444;">Estimated Overage Cost</h3>
      <p style="font-size: 32px; font-weight: bold; margin: 0; color: #ef4444;">€${overageCost.toFixed(2)}</p>
      <p style="margin: 10px 0 0; font-size: 14px; color: #6b7280;">This will be added to your next invoice</p>
    </div>

    <h3>Action Required:</h3>
    <p>To avoid future overage charges and save money, we recommend upgrading to a higher tier plan:</p>
    <ul>
      <li><strong>Standard Plan</strong>: 10 minutes/month at €8.99/minute overage</li>
      <li><strong>Advanced Plan</strong>: 50 minutes/month at €5.99/minute overage</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://axessible.ai/pricing" class="button">Upgrade Plan Now</a>
      <a href="https://axessible.ai/dashboard" class="button" style="background: #6b7280;">View Invoice</a>
    </div>

    <div class="footer">
      <p><strong>Questions about your bill?</strong> Contact us at <a href="mailto:billing@axessible.ai">billing@axessible.ai</a></p>
      <p style="font-size: 12px;">Billing cycle resets on ${cycleEndStr}</p>
    </div>
  </div>
</body>
</html>
        `
      };

    case 'overage_storage':
      return {
        subject: "🚨 Storage Limit Exceeded",
        html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .overage-box { background: white; border: 2px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .metric { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: #f3f4f6; border-radius: 4px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">🚨 Storage Full</h1>
    <p style="margin: 10px 0 0;">You've exceeded your storage limit</p>
  </div>
  <div class="content">
    <h2>Hello,</h2>
    <p><strong>You've exceeded your storage limit.</strong> You cannot upload new videos until you free up space or upgrade your plan.</p>
    
    <div class="overage-box">
      <h3 style="margin-top: 0; color: #ef4444;">Storage Status</h3>
      <div class="metric">
        <span><strong>Storage Used:</strong></span>
        <span style="color: #ef4444; font-weight: bold;">${usage.storage_used_gb.toFixed(1)} / ${usage.storage_limit_gb} GB</span>
      </div>
      <div class="metric">
        <span><strong>Over Limit By:</strong></span>
        <span style="color: #ef4444; font-weight: bold;">${(usage.storage_used_gb - usage.storage_limit_gb).toFixed(1)} GB</span>
      </div>
    </div>

    <h3>What you can do:</h3>
    <ul>
      <li><strong>Delete unused videos</strong> to free up space immediately</li>
      <li><strong>Upgrade your plan</strong> to get more storage</li>
      <li>Export and archive old videos to external storage</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://axessible.ai/pricing" class="button">Upgrade Plan</a>
      <a href="https://axessible.ai/videos" class="button" style="background: #6b7280;">Manage Videos</a>
    </div>

    <div class="footer">
      <p>Need help? Contact us at <a href="mailto:support@axessible.ai">support@axessible.ai</a></p>
    </div>
  </div>
</body>
</html>
        `
      };

    default:
      throw new Error(`Unknown notification type: ${type}`);
  }
}

serve(handler);

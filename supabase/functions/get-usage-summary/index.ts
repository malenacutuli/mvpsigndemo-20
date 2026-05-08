import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== GET USAGE SUMMARY FUNCTION CALLED ===");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("📊 Getting usage summary for user:", user.id);

    // Get subscriber info
    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscriber) {
      console.log("No subscriber record found, returning default free tier");
      return new Response(JSON.stringify({
        billingCycle: {
          start: new Date().toISOString(),
          end: null
        },
        usage: {
          minutesUsed: 0,
          minutesIncluded: 0,
          minutesRemaining: 0,
          storageUsedGB: 0,
          storageLimitGB: 1,
          storageRemainingGB: 1
        },
        costs: {
          overageMinutes: 0,
          overageCostEUR: 0,
          overageRateEUR: 0
        },
        tier: 'free',
        breakdown: []
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate billing cycle end (30 days from start)
    const cycleStart = new Date(subscriber.billing_cycle_start);
    const cycleEnd = new Date(cycleStart);
    cycleEnd.setDate(cycleEnd.getDate() + 30);

    // Get usage breakdown from current billing cycle
    const { data: usageRecords, error: usageError } = await supabase
      .from('usage_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('billing_cycle_start', subscriber.billing_cycle_start)
      .order('created_at', { ascending: false });

    if (usageError) {
      console.error("Error fetching usage records:", usageError);
    }

    // Group usage by processing type
    const breakdown: any[] = [];
    const typeGroups: { [key: string]: { count: number; minutes: number; cost: number } } = {};

    (usageRecords || []).forEach(record => {
      const type = record.processing_type;
      if (!typeGroups[type]) {
        typeGroups[type] = { count: 0, minutes: 0, cost: 0 };
      }
      typeGroups[type].count++;
      typeGroups[type].minutes += parseFloat(record.minutes_processed || 0);
      typeGroups[type].cost += parseFloat(record.cost_eur || 0);
    });

    // Convert to array
    Object.entries(typeGroups).forEach(([type, data]) => {
      breakdown.push({
        type,
        count: data.count,
        minutes: Math.round(data.minutes * 100) / 100,
        estimatedCost: Math.round(data.cost * 100) / 100
      });
    });

    // Sort by minutes desc
    breakdown.sort((a, b) => b.minutes - a.minutes);

    // Calculate totals
    const minutesUsed = subscriber.minutes_used || 0;
    const minutesIncluded = subscriber.minutes_included || 0;
    const minutesRemaining = Math.max(0, minutesIncluded - minutesUsed);
    const overageMinutes = Math.max(0, minutesUsed - minutesIncluded);
    
    // Get overage rate - CORRECT PRICING
    const overageRate = subscriber.subscription_tier === 'starter' ? 11.90 :
                       subscriber.subscription_tier === 'standard' ? 8.99 :
                       subscriber.subscription_tier === 'advanced' ? 5.99 : 0;
    
    const overageCost = overageMinutes * overageRate;

    const response = {
      billingCycle: {
        start: subscriber.billing_cycle_start,
        end: cycleEnd.toISOString()
      },
      usage: {
        minutesUsed,
        minutesIncluded,
        minutesRemaining,
        storageUsedGB: parseFloat(subscriber.storage_used_gb || 0),
        storageLimitGB: subscriber.storage_limit_gb || 1,
        storageRemainingGB: Math.max(0, (subscriber.storage_limit_gb || 1) - parseFloat(subscriber.storage_used_gb || 0))
      },
      costs: {
        overageMinutes,
        overageCostEUR: Math.round(overageCost * 100) / 100,
        overageRateEUR: overageRate
      },
      tier: subscriber.subscription_tier || 'free',
      breakdown,
      approachingLimit: minutesUsed >= (minutesIncluded * 0.8)
    };

    console.log("✅ Usage summary generated:", {
      minutesUsed,
      minutesIncluded,
      tier: subscriber.subscription_tier
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Function error:", error);
    
    return new Response(JSON.stringify({ 
      error: "Failed to get usage summary",
      details: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

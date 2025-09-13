import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-SUBSCRIPTION-INFO] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header provided");
      return new Response(JSON.stringify({ 
        error: "Authentication required",
        is_active: false,
        tier_name: 'free',
        expires_at: null,
        features_available: { storage_gb: 1, videos_per_month: 1 }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    logStep("Authorization header found");
    const token = authHeader.replace("Bearer ", "");
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { 
        auth: { persistSession: false },
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Authenticate the user first
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      logStep("Authentication failed", { error: userError?.message });
      return new Response(JSON.stringify({ 
        error: "Authentication failed",
        is_active: false,
        tier_name: 'free',
        expires_at: null,
        features_available: { storage_gb: 1, videos_per_month: 1 }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    logStep("User authenticated", { userId: userData.user.id });

    // Call the secure database function to get subscription info
    const { data: subscriptionInfo, error: subscriptionError } = await supabaseClient
      .rpc('get_user_subscription_info');

    if (subscriptionError) {
      logStep("Error calling secure subscription function", { error: subscriptionError.message });
      return new Response(JSON.stringify({ 
        error: "Failed to retrieve subscription information",
        is_active: false,
        tier_name: 'free',
        expires_at: null,
        features_available: { storage_gb: 1, videos_per_month: 1 }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // The function returns an array, get the first (and only) result
    const result = subscriptionInfo && subscriptionInfo.length > 0 ? subscriptionInfo[0] : {
      is_active: false,
      tier_name: 'free',
      expires_at: null,
      features_available: { storage_gb: 1, videos_per_month: 1 }
    };

    logStep("Successfully retrieved subscription info", { 
      isActive: result.is_active, 
      tier: result.tier_name,
      hasFeatures: !!result.features_available 
    });

    // Return sanitized subscription information
    return new Response(JSON.stringify({
      subscribed: result.is_active,
      subscription_tier: result.tier_name,
      subscription_end: result.expires_at,
      features: result.features_available
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in get-subscription-info", { message: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage,
      subscribed: false,
      subscription_tier: 'free',
      subscription_end: null,
      features: { storage_gb: 1, videos_per_month: 1 }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
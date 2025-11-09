import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { plan } = await req.json();
    logStep("Request received", { plan });

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2023-10-16" 
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer found, will create new one");
    }

    // Define pricing based on plan (in Euro cents)
    let priceAmount: number;
    let planName: string;
    let storageLimit: number; // in GB
    let includedMinutes: number;
    
    switch (plan) {
      case 'starter':
        priceAmount = 2600; // €26.00 in cents
        planName = 'Starter Plan';
        storageLimit = 100;
        includedMinutes = 5;
        break;
      case 'standard':
        priceAmount = 6500; // €65.00 in cents
        planName = 'Standard Plan';
        storageLimit = 650; // 650GB
        includedMinutes = 10;
        break;
      case 'advanced':
        priceAmount = 25000; // €250.00 in cents
        planName = 'Advanced Plan';
        storageLimit = 2048; // 2TB
        includedMinutes = 50;
        break;
      default:
        throw new Error("Invalid plan selected");
    }

    logStep("Creating checkout session", { plan, priceAmount, planName, storageLimit, includedMinutes });

    // Configure trial period for starter plan
    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { 
              name: planName,
              description: `${storageLimit}GB hosting • ${includedMinutes} minutes processing included`
            },
            unit_amount: priceAmount,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/dashboard?checkout=success`,
      cancel_url: `${req.headers.get("origin")}/pricing?checkout=cancelled`,
      metadata: {
        plan: plan,
        storage_limit_gb: storageLimit.toString(),
        included_minutes: includedMinutes.toString()
      }
    };

    // Add 30-day trial for starter plan
    if (plan === 'starter') {
      sessionConfig.subscription_data = {
        trial_period_days: 30,
      };
      logStep("Adding 30-day trial period for starter plan");
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
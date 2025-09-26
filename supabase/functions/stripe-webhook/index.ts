import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Webhook received");
    
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2023-10-16" 
    });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("No webhook secret configured");
    }

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook verified", { type: event.type, id: event.id });
    } catch (err) {
      logStep("Webhook signature verification failed", { error: err.message });
      return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'invoice.payment_succeeded':
        await handleSubscriptionEvent(event, supabaseClient, stripe);
        break;
      
      case 'customer.subscription.deleted':
      case 'invoice.payment_failed':
        await handleSubscriptionCancellation(event, supabaseClient, stripe);
        break;

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handleSubscriptionEvent(event: any, supabaseClient: any, stripe: Stripe) {
  let subscription;
  
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object;
    if (invoice.subscription) {
      subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    } else {
      logStep("Invoice not related to subscription, skipping");
      return;
    }
  } else {
    subscription = event.data.object;
  }

  logStep("Processing subscription event", { 
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status 
  });

  // Get customer details
  const customer = await stripe.customers.retrieve(subscription.customer);
  if (!customer || customer.deleted) {
    throw new Error("Customer not found");
  }

  const customerEmail = (customer as any).email;
  if (!customerEmail) {
    throw new Error("Customer email not found");
  }

  // Determine subscription tier based on price
  const priceId = subscription.items.data[0]?.price.id;
  const priceAmount = subscription.items.data[0]?.price.unit_amount || 0;
  
  let subscriptionTier = 'starter';
  if (priceAmount >= 25000) {
    subscriptionTier = 'advanced';
  } else if (priceAmount >= 6500) {
    subscriptionTier = 'standard';
  }

  // Calculate subscription end date
  const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

  // Use secure system function to manage subscription data
  const { error } = await supabaseClient.rpc('system_manage_subscription', {
    target_user_id: null, // User ID unknown in webhook context, will be linked when user signs up
    stripe_customer: subscription.customer,
    tier: subscriptionTier,
    is_active: subscription.status === 'active',
    end_date: subscriptionEnd
  });

  if (error) {
    logStep("Database update failed", { error: error.message });
    throw error;
  }

  logStep("Subscription updated successfully", { 
    email: customerEmail, 
    tier: subscriptionTier,
    active: subscription.status === 'active'
  });
}

async function handleSubscriptionCancellation(event: any, supabaseClient: any, stripe: Stripe) {
  let subscription;
  
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    if (invoice.subscription) {
      subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    } else {
      return; // Not a subscription invoice
    }
  } else {
    subscription = event.data.object;
  }

  logStep("Processing subscription cancellation", { 
    subscriptionId: subscription.id,
    customerId: subscription.customer 
  });

  // Get customer details
  const customer = await stripe.customers.retrieve(subscription.customer);
  if (!customer || customer.deleted) {
    throw new Error("Customer not found");
  }

  const customerEmail = (customer as any).email;
  
  // Use secure system function to cancel subscription
  const { error } = await supabaseClient.rpc('system_manage_subscription', {
    target_user_id: null, // User ID unknown in webhook context
    stripe_customer: subscription.customer,
    tier: null,
    is_active: false,
    end_date: new Date().toISOString()
  });

  if (error) {
    logStep("Cancellation update failed", { error: error.message });
    throw error;
  }

  logStep("Subscription cancelled successfully", { email: customerEmail });
}
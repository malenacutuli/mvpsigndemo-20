import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileSize, userId } = await req.json();

    if (!userId || !fileSize) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: userId and fileSize" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // CHECK ADMIN STATUS FIRST
    const { data: isAdmin, error: roleError } = await supabase.rpc(
      "has_role",
      { _user_id: userId, _role: "admin" }
    );

    if (roleError) {
      console.error("Error checking admin status:", roleError);
    }

    // ADMIN BYPASS: Always allow uploads for admins
    if (isAdmin) {
      return new Response(
        JSON.stringify({
          allowed: true,
          currentUsage: 0,
          limit: 0,
          tier: 'admin',
          message: 'Admin user - unlimited storage',
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current storage usage
    const { data: usage, error: usageError } = await supabase.rpc(
      "get_user_storage_usage",
      { target_user_id: userId }
    );

    if (usageError) {
      console.error("Error fetching storage usage:", usageError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch storage usage", details: usageError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!usage || usage.length === 0) {
      return new Response(
        JSON.stringify({ error: "No storage usage data found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const storageData = usage[0];
    const wouldExceedLimit = (storageData.storage_used_bytes + fileSize) > storageData.storage_limit_bytes;

    if (wouldExceedLimit) {
      return new Response(
        JSON.stringify({
          allowed: false,
          reason: "storage_limit_exceeded",
          currentUsage: storageData.storage_used_bytes,
          limit: storageData.storage_limit_bytes,
          fileSize: fileSize,
          tier: storageData.tier,
          message: `Storage limit exceeded. This ${(fileSize / 1073741824).toFixed(2)}GB file would exceed your ${storageData.tier} plan limit.`,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        allowed: true,
        currentUsage: storageData.storage_used_bytes,
        limit: storageData.storage_limit_bytes,
        remainingAfterUpload: storageData.storage_limit_bytes - (storageData.storage_used_bytes + fileSize),
        tier: storageData.tier,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Validation error:", error);
    return new Response(
      JSON.stringify({ error: "Upload validation failed", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
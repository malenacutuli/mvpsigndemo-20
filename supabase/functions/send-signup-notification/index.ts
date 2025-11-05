import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validation schema for signup notification
const SignupNotificationSchema = z.object({
  userEmail: z.string().email().max(255),
  displayName: z.string().max(100).optional(),
  userId: z.string().uuid(),
  // Internal auth key to prevent abuse
  authKey: z.string().min(32).optional(),
});

interface SignupNotificationRequest {
  userEmail: string;
  displayName?: string;
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[SIGNUP-NOTIFICATION] Function started");
    
    const rawData = await req.json();
    
    // Validate input
    const validatedData = SignupNotificationSchema.parse(rawData);
    const { userEmail, displayName, userId, authKey } = validatedData;

    // Security: Verify internal auth key or service role header
    const INTERNAL_SIGNUP_KEY = Deno.env.get("INTERNAL_SIGNUP_AUTH_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("authorization");

    // Allow if:
    // 1. Request includes valid internal auth key, OR
    // 2. Request uses service role key (from Supabase Auth triggers)
    const isAuthorized = (
      (authKey && INTERNAL_SIGNUP_KEY && authKey === INTERNAL_SIGNUP_KEY) ||
      (authHeader && authHeader.includes(serviceRoleKey || ''))
    );

    if (!isAuthorized) {
      console.warn("[SIGNUP-NOTIFICATION] Unauthorized request attempt");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { 
          status: 401, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }
    
    console.log("[SIGNUP-NOTIFICATION] Processing authorized signup notification", { userEmail, userId });

    const emailResponse = await resend.emails.send({
      from: "Axessible <no-reply@axessvideo.com>",
      to: ["malena@axessible.ai"],
      subject: "New User Signup - Axessible",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; border-bottom: 2px solid #3B82F6; padding-bottom: 10px;">
            🎉 New User Signup
          </h1>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #495057; margin-top: 0;">User Details:</h2>
            <ul style="color: #6c757d; line-height: 1.6;">
              <li><strong>Email:</strong> ${userEmail}</li>
              <li><strong>Display Name:</strong> ${displayName || 'Not provided'}</li>
              <li><strong>User ID:</strong> ${userId}</li>
              <li><strong>Signup Time:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196f3;">
            <p style="margin: 0; color: #1565c0;">
              <strong>Action Required:</strong> You may want to follow up with this new user to ensure they have a great onboarding experience!
            </p>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
          
          <p style="color: #6c757d; font-size: 14px; text-align: center;">
            This notification was sent automatically from Axessible platform.
          </p>
        </div>
      `,
    });

    console.log("[SIGNUP-NOTIFICATION] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[SIGNUP-NOTIFICATION] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
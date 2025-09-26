import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    
    const { userEmail, displayName, userId }: SignupNotificationRequest = await req.json();
    
    console.log("[SIGNUP-NOTIFICATION] Processing signup notification", { userEmail, userId });

    const emailResponse = await resend.emails.send({
      from: "Axessible <no-reply@axessvideo.com>",
      to: ["malena@axessvideo.com"],
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
        error: error.message,
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
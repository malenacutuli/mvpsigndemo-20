import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DemoRequestData {
  name: string;
  email: string;
  company?: string;
  message?: string;
  to: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, company, message, to }: DemoRequestData = await req.json();

    // For now, we'll return a success response
    // In a production environment, you would integrate with an email service like Resend
    console.log('Demo request received:', { name, email, company, message, to });

    // Simulate sending email to hello@axessible.ai
    const emailContent = `
New Demo Request from ${name}

Email: ${email}
Company: ${company || 'Not specified'}

Message:
${message || 'No additional message provided'}

Please reach out to schedule a demo.
    `;

    console.log('Email content that would be sent to', to, ':', emailContent);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Demo request received successfully' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error: any) {
    console.error("Error processing demo request:", error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process demo request',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
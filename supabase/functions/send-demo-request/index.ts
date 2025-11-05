import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const DemoRequestSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().trim().email("Invalid email format").max(255, "Email too long"),
  company: z.string().trim().max(100, "Company name too long").optional(),
  message: z.string().trim().max(5000, "Message too long").optional(),
  to: z.string().trim().email("Invalid recipient email"),
});

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
    // Parse and validate input
    const rawData = await req.json();
    const validatedData = DemoRequestSchema.parse(rawData);
    const { name, email, company, message, to } = validatedData;

    // Sanitize text to prevent injection
    const sanitize = (text: string | undefined) => 
      text ? text.replace(/[<>]/g, '').substring(0, 5000) : '';

    const sanitizedName = sanitize(name);
    const sanitizedCompany = sanitize(company);
    const sanitizedMessage = sanitize(message);

    // For now, we'll return a success response
    // In a production environment, you would integrate with an email service like Resend
    console.log('Demo request received:', { name: sanitizedName, email, company: sanitizedCompany, to });

    // Simulate sending email to hello@axessible.ai
    const emailContent = `
New Demo Request from ${sanitizedName}

Email: ${email}
Company: ${sanitizedCompany || 'Not specified'}

Message:
${sanitizedMessage || 'No additional message provided'}

Please reach out to schedule a demo.
    `;

    console.log('Email content that would be sent to', to);

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
    
    // Return validation errors with 400 status
    const statusCode = error.name === 'ZodError' ? 400 : 500;
    const errorMessage = error.name === 'ZodError' 
      ? 'Invalid input data'
      : 'Failed to process demo request';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error.message 
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
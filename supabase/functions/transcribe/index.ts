import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve((req) => {
  console.log("Function called");
  
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      }
    });
  }

  return new Response(JSON.stringify({
    success: true,
    message: "Basic function works",
    text: "Test transcript",
    segments: [{
      id: 0,
      start: 0,
      end: 1,
      text: "Test transcript",
      confidence: 1.0
    }]
  }), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json"
    }
  });
});
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { query, endpoint = "search", limit = 5 } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: "Missing 'query'" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const MAPBOX_PUBLIC_TOKEN = Deno.env.get("MAPBOX_PUBLIC_TOKEN");
    if (!MAPBOX_PUBLIC_TOKEN) {
      return new Response(JSON.stringify({ error: "MAPBOX_PUBLIC_TOKEN not configured" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    let url;
    if (endpoint === "search") {
      // Geocoding API (search for places)
      url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&access_token=${MAPBOX_PUBLIC_TOKEN}&limit=${limit}`;
    } else if (endpoint === "reverse") {
      // Reverse geocoding (coordinates to place)
      url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${query.longitude}&latitude=${query.latitude}&access_token=${MAPBOX_PUBLIC_TOKEN}&limit=${limit}`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid endpoint. Use 'search' or 'reverse'" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mapbox API error:", errorText);
      return new Response(JSON.stringify({ error: "Mapbox API error", details: errorText }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    console.log("Mapbox geocoding successful");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in mapbox-geocoding function:", error);
    return new Response(JSON.stringify({ error: "Unexpected error", details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
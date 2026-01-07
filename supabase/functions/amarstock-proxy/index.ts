import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_BASE = "https://api.amarstock.com/company/ub5aed";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint");
    const code = url.searchParams.get("code") || url.searchParams.get("symbol");
    const count = url.searchParams.get("count");

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: "Missing endpoint parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let apiUrl = "";
    switch (endpoint) {
      case "dividend":
        apiUrl = `${API_BASE}/dividend/?symbol=${code || "GP"}&Count=${count || 4}`;
        break;
      case "financial":
        apiUrl = `${API_BASE}/financial/?code=${code || "GP"}&Count=${count || 4}`;
        break;
      case "market-depth":
        apiUrl = `${API_BASE}/market-depth/?code=${code || "GP"}`;
        break;
      case "share-distribution":
        apiUrl = `${API_BASE}/share-distribution/?code=${code || "GP"}`;
        break;
      case "news":
        apiUrl = `${API_BASE}/news/?code=${code || "GP"}`;
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Invalid endpoint" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Fetch with JSONP workaround - append callback and strip it
    const callbackName = "jsonpCallback";
    apiUrl += `&callback=${callbackName}`;

    console.log("Fetching:", apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        "Accept": "*/*",
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const text = await response.text();
    
    // Extract JSON from JSONP response: callbackName([...]) or callbackName({...}) with optional semicolon
    const jsonMatch = text.match(new RegExp(`${callbackName}\\((.*)\\);?$`, 's'));
    
    if (jsonMatch && jsonMatch[1]) {
      const jsonData = JSON.parse(jsonMatch[1]);
      return new Response(
        JSON.stringify(jsonData),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If not JSONP format, try parsing as regular JSON
    try {
      const jsonData = JSON.parse(text);
      return new Response(
        JSON.stringify(jsonData),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to parse response", raw: text.substring(0, 500) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

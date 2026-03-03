import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    if (!CLOUDFLARE_ACCOUNT_ID) {
      throw new Error("CLOUDFLARE_ACCOUNT_ID is not configured");
    }

    const CLOUDFLARE_STREAM_API_TOKEN = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN");
    if (!CLOUDFLARE_STREAM_API_TOKEN) {
      throw new Error("CLOUDFLARE_STREAM_API_TOKEN is not configured");
    }

    const { maxDurationSeconds = 30 } = await req.json().catch(() => ({}));

    // Create a direct creator upload URL
    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maxDurationSeconds,
          requireSignedURLs: false,
        }),
      }
    );

    const cfData = await cfResponse.json();

    if (!cfResponse.ok || !cfData.success) {
      throw new Error(
        `Cloudflare Stream API error [${cfResponse.status}]: ${JSON.stringify(cfData.errors)}`
      );
    }

    const { uploadURL, uid } = cfData.result;

    return new Response(
      JSON.stringify({ uploadURL, videoId: uid }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error creating upload URL:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

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

    const url = new URL(req.url);
    const videoId = url.searchParams.get("videoId");

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "videoId query parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${videoId}`,
      {
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_STREAM_API_TOKEN}`,
        },
      }
    );

    const cfData = await cfResponse.json();

    if (!cfResponse.ok || !cfData.success) {
      throw new Error(
        `Cloudflare Stream API error [${cfResponse.status}]: ${JSON.stringify(cfData.errors)}`
      );
    }

    const video = cfData.result;

    return new Response(
      JSON.stringify({
        videoId: video.uid,
        status: video.status?.state,
        thumbnailUrl: video.thumbnail,
        playbackUrl: video.playback?.hls,
        dashUrl: video.playback?.dash,
        duration: video.duration,
        readyToStream: video.readyToStream,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error fetching video:", error);
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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // TODO: Implement actual winner selection logic based on most-liked videos
    // For now, this is a placeholder that:
    // 1. Calculates the prize pool from active subscriber count
    // 2. Fetches top 10 winners (to be implemented with videos/likes table)
    // 3. Splits the pool and transfers to each winner's Connect account

    // Get all eligible connect accounts (onboarding complete + payouts enabled)
    const { data: eligibleAccounts } = await supabaseClient
      .from("stripe_connect_accounts")
      .select("*")
      .eq("onboarding_complete", true)
      .eq("payouts_enabled", true);

    console.log(`[WEEKLY-PAYOUTS] Found ${eligibleAccounts?.length ?? 0} eligible accounts`);

    // Placeholder: Calculate prize pool
    // In production, query active subscribers and multiply by $3.12
    // Then get top 10 most-liked videos and their creators
    // Split pool equally among top 10

    // Example transfer (commented out until winner logic is implemented):
    // const amountPerWinner = Math.floor(prizePool / winners.length);
    // for (const winner of winners) {
    //   await stripe.transfers.create({
    //     amount: amountPerWinner,
    //     currency: "usd",
    //     destination: winner.stripe_account_id,
    //     description: "Weekly prize pool payout",
    //   });
    // }

    return new Response(
      JSON.stringify({
        success: true,
        eligible_accounts: eligibleAccounts?.length ?? 0,
        message: "Payout processing placeholder - winner logic pending",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("process-weekly-payouts error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

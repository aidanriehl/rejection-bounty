import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    // Get connect account from DB
    const { data: connectData } = await supabaseClient
      .from("stripe_connect_accounts")
      .select("*")
      .eq("user_id", userData.user.id)
      .single();

    if (!connectData) {
      return new Response(JSON.stringify({ connected: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check status with Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "");

    const account = await stripe.accounts.retrieve(connectData.stripe_account_id);
    const onboardingComplete = account.details_submitted ?? false;
    const payoutsEnabled = account.payouts_enabled ?? false;

    // Update DB if status changed
    if (
      onboardingComplete !== connectData.onboarding_complete ||
      payoutsEnabled !== connectData.payouts_enabled
    ) {
      await supabaseClient
        .from("stripe_connect_accounts")
        .update({ onboarding_complete: onboardingComplete, payouts_enabled: payoutsEnabled })
        .eq("user_id", userData.user.id);
    }

    return new Response(
      JSON.stringify({
        connected: true,
        onboarding_complete: onboardingComplete,
        payouts_enabled: payoutsEnabled,
        email: connectData.email,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("check-connect-status error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

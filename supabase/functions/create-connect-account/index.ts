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
    const user = userData.user;

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    
    console.log("Creating Stripe client...");
    const stripe = new Stripe(stripeKey);

    // Check if user already has a connect account
    const { data: existing } = await supabaseClient
      .from("stripe_connect_accounts")
      .select("*")
      .eq("user_id", user.id)
      .single();

    let stripeAccountId: string;

    if (existing?.stripe_account_id) {
      console.log("Found existing connect account:", existing.stripe_account_id);
      stripeAccountId = existing.stripe_account_id;
    } else {
      console.log("Creating new Express connect account for:", user.email);
      // Create new Express connected account
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      stripeAccountId = account.id;
      console.log("Created connect account:", stripeAccountId);

      // Store in DB using service role to bypass RLS for initial insert
      const { error: upsertError } = await supabaseClient.from("stripe_connect_accounts").upsert({
        user_id: user.id,
        stripe_account_id: stripeAccountId,
        email: user.email,
      });
      if (upsertError) {
        console.error("Failed to store connect account:", upsertError);
      }
    }

    // Create account link for onboarding
    const origin = req.headers.get("origin") || "https://rejection-bounty.lovable.app";
    console.log("Creating account link with origin:", origin);
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/settings?connect=refresh`,
      return_url: `${origin}/settings?connect=complete`,
      type: "account_onboarding",
    });

    console.log("Account link created successfully");
    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("create-connect-account error:", msg);
    if (error instanceof Error && error.stack) {
      console.error("Stack:", error.stack);
    }
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

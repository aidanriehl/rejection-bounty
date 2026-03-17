import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const DEMO_EMAIL = "demo@rejectionbounty.com";
    const DEMO_PASSWORD = "DemoReview2026!";

    // Check if demo user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === DEMO_EMAIL);

    let userId: string;

    if (existing) {
      userId = existing.id;
      // Update password in case it changed
      await supabase.auth.admin.updateUserById(userId, {
        password: DEMO_PASSWORD,
        email_confirm: true,
      });
      console.log("Demo user already exists, updated password:", userId);
    } else {
      // Create the demo auth user
      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
          email_confirm: true,
        });

      if (createError) throw createError;
      userId = newUser.user.id;
      console.log("Created demo user:", userId);
    }

    // Upsert profile with demo stats
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          username: "DemoReviewer",
          avatar: "fox",
          avatar_stage: 2,
          streak: 3,
          best_streak: 5,
          total_completed: 12,
          weeks_completed: 4,
        },
        { onConflict: "id" }
      );

    if (profileError) {
      console.error("Profile upsert error:", profileError);
    }

    // Get current week key (YYYY-WXX format)
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.ceil(
      ((now.getTime() - startOfYear.getTime()) / 86400000 +
        startOfYear.getDay() +
        1) /
        7
    );
    const weekKey = `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;

    // Get active challenges for this week
    const { data: challenges } = await supabase
      .from("challenges")
      .select("id, title")
      .eq("week_key", weekKey)
      .eq("is_active", true)
      .limit(3);

    if (challenges && challenges.length > 0) {
      // Insert completions for demo user (ignore conflicts)
      for (const challenge of challenges) {
        await supabase.from("challenge_completions").upsert(
          {
            user_id: userId,
            challenge_id: challenge.id,
            week_key: weekKey,
            video_url: null, // You'll add real video URLs later
          },
          { onConflict: "user_id,challenge_id,week_key" as any }
        );
      }
    }

    // Add a past weekly drawing entry if none exists
    const prevWeekNum = weekNum - 1;
    const prevWeekKey = `${now.getFullYear()}-W${String(prevWeekNum).padStart(2, "0")}`;

    const { data: existingDrawing } = await supabase
      .from("weekly_drawings")
      .select("id")
      .eq("week_key", prevWeekKey)
      .limit(1);

    if (!existingDrawing || existingDrawing.length === 0) {
      await supabase.from("weekly_drawings").insert({
        week_key: prevWeekKey,
        status: "completed",
        prize_amount: 25.0,
        winner_user_id: userId,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        weekKey,
        message: "Demo account seeded. Use these credentials in App Store Connect.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

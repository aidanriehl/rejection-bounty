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

    // A public-domain sample video for placeholder content
    const PLACEHOLDER_VIDEO =
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

    // ── 1. Create or update demo auth user ──
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === DEMO_EMAIL);

    let userId: string;

    if (existing) {
      userId = existing.id;
      await supabase.auth.admin.updateUserById(userId, {
        password: DEMO_PASSWORD,
        email_confirm: true,
      });
      console.log("Demo user exists, updated:", userId);
    } else {
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

    // ── 2. Upsert profile with demo stats ──
    await supabase.from("profiles").upsert(
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

    // ── 3. Week keys ──
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.ceil(
      ((now.getTime() - startOfYear.getTime()) / 86400000 +
        startOfYear.getDay() +
        1) /
        7
    );
    const weekKey = `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
    const prevWeekNum = weekNum - 1;
    const prevWeekKey = `${now.getFullYear()}-W${String(prevWeekNum).padStart(2, "0")}`;

    // ── 4. Seed challenge completions for current week ──
    const { data: challenges } = await supabase
      .from("challenges")
      .select("id, title")
      .eq("week_key", weekKey)
      .eq("is_active", true)
      .limit(5);

    if (challenges && challenges.length > 0) {
      for (const challenge of challenges) {
        await supabase.from("challenge_completions").upsert(
          {
            user_id: userId,
            challenge_id: challenge.id,
            week_key: weekKey,
            video_url: PLACEHOLDER_VIDEO,
          },
          { onConflict: "user_id,challenge_id,week_key" as any }
        );

        // Also create a post so it shows in the feed
        const { data: existingPost } = await supabase
          .from("posts")
          .select("id")
          .eq("user_id", userId)
          .eq("challenge_id", challenge.id)
          .limit(1);

        if (!existingPost || existingPost.length === 0) {
          await supabase.from("posts").insert({
            user_id: userId,
            challenge_id: challenge.id,
            video_url: PLACEHOLDER_VIDEO,
            caption: `Completed: ${challenge.title} 💪`,
            likes: Math.floor(Math.random() * 10) + 1,
            trim_start: 0,
            trim_end: 5,
            thumbnail_time: 1,
          });
        }
      }
    }

    // ── 5. Past weekly drawing with winning video ──
    const { data: existingDrawing } = await supabase
      .from("weekly_drawings")
      .select("id")
      .eq("week_key", prevWeekKey)
      .limit(1);

    if (!existingDrawing || existingDrawing.length === 0) {
      await supabase.from("weekly_drawings").insert({
        week_key: prevWeekKey,
        status: "complete",
        prize_amount: 25.0,
        winner_user_id: userId,
        winning_video_url: PLACEHOLDER_VIDEO,
        trim_start: 0,
        trim_end: 5,
      });
    } else {
      // Update existing to ensure it has a video
      await supabase
        .from("weekly_drawings")
        .update({
          status: "complete",
          winner_user_id: userId,
          winning_video_url: PLACEHOLDER_VIDEO,
          trim_start: 0,
          trim_end: 5,
          prize_amount: 25.0,
        })
        .eq("week_key", prevWeekKey);
    }

    // ── 6. Seed previous week challenges + completions for recap ──
    const { data: prevChallenges } = await supabase
      .from("challenges")
      .select("id, title")
      .eq("week_key", prevWeekKey)
      .eq("is_active", true)
      .limit(5);

    if (prevChallenges && prevChallenges.length > 0) {
      for (const ch of prevChallenges) {
        await supabase.from("challenge_completions").upsert(
          {
            user_id: userId,
            challenge_id: ch.id,
            week_key: prevWeekKey,
            video_url: PLACEHOLDER_VIDEO,
          },
          { onConflict: "user_id,challenge_id,week_key" as any }
        );
      }
    }

    // ── 7. Add a subscription so demo user sees premium features ──
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (!existingSub || existingSub.length === 0) {
      await supabase.from("subscriptions").insert({
        user_id: userId,
        status: "active",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        weekKey,
        prevWeekKey,
        message:
          "Demo account fully seeded with profile, posts, winning video, subscription, and challenge data.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

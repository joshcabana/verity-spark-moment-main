import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXTEND_COST = 1;
const EXTEND_SECONDS = 90;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Supabase environment is not configured" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (userError || !user) {
      await supabase.rpc("log_runtime_alert_event", {
        p_event_source: "spark-extend",
        p_event_type: "auth_rejected",
        p_severity: "warning",
        p_status_code: 401,
        p_details: { message: userError?.message ?? "User not found from JWT" },
      });

      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Check if this user has an active Verity Pass subscription.
    const today = new Date().toISOString().split("T")[0]; // UTC date YYYY-MM-DD

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString())
      .maybeSingle();

    const isSubscriber = Boolean(subscription);

    if (isSubscriber) {
      // Attempt to claim today's free extension by inserting into the log.
      // The unique index on (user_id, used_date) prevents double-claiming.
      const { error: logError } = await supabase
        .from("spark_extension_log")
        .insert({ user_id: user.id, used_date: today });

      if (!logError) {
        // Successfully claimed today's free extension — no token charge.
        return new Response(
          JSON.stringify({
            success: true,
            extraSeconds: EXTEND_SECONDS,
            freeExtension: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
        );
      }

      // logError means unique constraint was violated (already used today) — fall through to token charge.
    }

    // Non-subscribers or subscribers who already used their free extension today: charge 1 token.
    const { data: newBalance, error: decrementError } = await supabase.rpc("increment_user_tokens", {
      p_user_id: user.id,
      p_delta: -EXTEND_COST,
      p_type: "spend",
      p_description: "Spark Extension (+90s)",
    });

    if (decrementError) {
      if (decrementError.message.includes("Insufficient token balance")) {
        const { data: tokens } = await supabase
          .from("user_tokens")
          .select("balance")
          .eq("user_id", user.id)
          .single();

        return new Response(
          JSON.stringify({ error: "Not enough tokens", balance: tokens?.balance ?? 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 },
        );
      }

      await supabase.rpc("log_runtime_alert_event", {
        p_event_source: "spark-extend",
        p_event_type: "rpc_exception",
        p_severity: "error",
        p_status_code: 500,
        p_user_id: user.id,
        p_details: { message: decrementError.message },
      });

      throw decrementError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        extraSeconds: EXTEND_SECONDS,
        freeExtension: false,
        newBalance,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    await supabase.rpc("log_runtime_alert_event", {
      p_event_source: "spark-extend",
      p_event_type: "execution_error",
      p_severity: "error",
      p_status_code: 500,
      p_details: { message: msg },
    });

    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

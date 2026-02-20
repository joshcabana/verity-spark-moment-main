import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify admin role
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Check admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

    // ─── LIST FLAGGED EVENTS ───
    if (action === "list") {
      const page = parseInt(url.searchParams.get("page") || "0");
      const limit = 20;
      const { data: events, error } = await adminClient
        .from("moderation_events")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      if (error) throw error;

      // Get offender profiles
      const offenderIds = [...new Set(events?.map(e => e.offender_id) || [])];
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("user_id, display_name, verification_status, verified_phone")
        .in("user_id", offenderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enriched = events?.map(e => ({
        ...e,
        offender_profile: profileMap.get(e.offender_id) || null,
      }));

      return new Response(JSON.stringify({ events: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── GET CLIP SIGNED URL ───
    if (action === "get-clip") {
      const clipPath = url.searchParams.get("path");
      if (!clipPath) {
        return new Response(JSON.stringify({ error: "Missing clip path" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: signedUrl, error } = await adminClient.storage
        .from("moderation-clips")
        .createSignedUrl(clipPath, 300); // 5 min expiry

      if (error) throw error;

      return new Response(JSON.stringify({ url: signedUrl.signedUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── BAN USER ───
    if (action === "ban" && req.method === "POST") {
      const { targetUserId, reason, banType, durationDays, eventId } = await req.json();
      if (!targetUserId || !reason) {
        return new Response(JSON.stringify({ error: "Missing targetUserId or reason" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expiresAt = banType === "permanent" ? null
        : new Date(Date.now() + (durationDays || 7) * 24 * 60 * 60 * 1000).toISOString();

      await adminClient.from("user_bans").insert({
        user_id: targetUserId,
        reason,
        ban_type: banType || "temporary",
        expires_at: expiresAt,
        moderation_event_id: eventId || null,
      });

      // Mark event as reviewed
      if (eventId) {
        await adminClient.from("moderation_events").update({
          reviewed: true,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
          review_outcome: "ban_confirmed",
        }).eq("id", eventId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── OVERRIDE APPEAL ───
    if (action === "override-appeal" && req.method === "POST") {
      const { appealId, outcome, tokensAwarded } = await req.json();
      if (!appealId || !outcome) {
        return new Response(JSON.stringify({ error: "Missing appealId or outcome" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminClient.from("appeals").update({
        status: outcome, // 'approved' or 'rejected'
        resolved_at: new Date().toISOString(),
        resolution_text: `Reviewed by admin`,
        apology_tokens_awarded: tokensAwarded || 0,
      }).eq("id", appealId);

      // If appeal approved, lift ban
      if (outcome === "approved") {
        const { data: appeal } = await adminClient
          .from("appeals")
          .select("user_id, moderation_event_id")
          .eq("id", appealId)
          .single();

        if (appeal) {
          // Lift related bans
          await adminClient.from("user_bans").update({
            lifted_at: new Date().toISOString(),
          }).eq("user_id", appeal.user_id).is("lifted_at", null);

          // Award apology tokens
          if (tokensAwarded && tokensAwarded > 0) {
            const { error: incrementError } = await adminClient.rpc("increment_user_tokens", {
              p_user_id: appeal.user_id,
              p_delta: tokensAwarded,
              p_type: "refund",
              p_description: "Apology tokens for overturned violation",
            });

            if (incrementError) {
              await adminClient.rpc("log_runtime_alert_event", {
                p_event_source: "admin-moderation",
                p_event_type: "rpc_exception",
                p_severity: "error",
                p_status_code: 500,
                p_user_id: appeal.user_id,
                p_details: { rpc: "increment_user_tokens", message: incrementError.message },
              });
              throw incrementError;
            }
          }

          // Update moderation event
          if (appeal.moderation_event_id) {
            await adminClient.from("moderation_events").update({
              reviewed: true,
              reviewed_at: new Date().toISOString(),
              reviewed_by: userId,
              review_outcome: "appeal_approved",
            }).eq("id", appeal.moderation_event_id);
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── DISMISS EVENT ───
    if (action === "dismiss" && req.method === "POST") {
      const { eventId } = await req.json();
      if (!eventId) {
        return new Response(JSON.stringify({ error: "Missing eventId" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminClient.from("moderation_events").update({
        reviewed: true,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
        review_outcome: "dismissed",
      }).eq("id", eventId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── LIST APPEALS ───
    if (action === "list-appeals") {
      const { data: appeals, error } = await adminClient
        .from("appeals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return new Response(JSON.stringify({ appeals }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── STATS ───
    if (action === "stats") {
      const { data: stats } = await adminClient
        .from("moderation_stats")
        .select("*")
        .order("date", { ascending: false })
        .limit(30);

      const { data: pendingCount } = await adminClient
        .from("moderation_events")
        .select("id", { count: "exact", head: true })
        .eq("reviewed", false);

      const { data: pendingAppeals } = await adminClient
        .from("appeals")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      return new Response(JSON.stringify({
        stats,
        pendingEvents: pendingCount,
        pendingAppeals,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-moderation error:", e);

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (serviceKey && supabaseUrl) {
      const alertClient = createClient(supabaseUrl, serviceKey);
      await alertClient.rpc("log_runtime_alert_event", {
        p_event_source: "admin-moderation",
        p_event_type: "execution_error",
        p_severity: "error",
        p_status_code: 500,
        p_details: { message: e instanceof Error ? e.message : "Unknown error" },
      });
    }

    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

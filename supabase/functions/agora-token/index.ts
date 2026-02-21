/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { RtcTokenBuilder, RtcRole } from "npm:agora-token@2.0.4";
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return new Response(JSON.stringify({ error: "Supabase environment is not configured" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const supabaseClient = createClient(supabaseUrl, anonKey);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const { data, error: userError } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { channelName, uid } = await req.json();
    if (!channelName) {
      return new Response(JSON.stringify({ error: "Missing channelName" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // ENFORCE RATE LIMIT: 10 requests per 60 seconds
    const { data: isAllowed, error: rateLimitError } = await supabaseClient
      .rpc("rpc_check_rate_limit", {
        p_user_id: user.id,
        p_endpoint: "agora-token",
        p_limit: 10,
        p_window_seconds: 60,
      });

    if (rateLimitError || !isAllowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    // ENFORCE SECURITY: Support both 1v1 match UUIDs and circle_<uuid> rooms
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let isAuthorized = false;

    if (channelName.startsWith("circle_")) {
      const targetUserId = channelName.replace("circle_", "");
      if (!uuidRegex.test(targetUserId)) {
        return new Response(JSON.stringify({ error: "Invalid Circle format (must be circle_uuid)" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Owner joining their own circle
      if (user.id === targetUserId) {
        isAuthorized = true;
      } else {
        // Guest joining: must have a mutual match with the circle owner
        const { data: mutualMatch, error: mutualError } = await supabaseClient
          .from("matches")
          .select("id")
          .eq("is_mutual", true)
          .or(`and(user1_id.eq.${user.id},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${user.id})`)
          .maybeSingle();

        if (!mutualError && mutualMatch) {
          isAuthorized = true;
        }
      }
    } else {
      // Standard 1v1 Match Logic
      if (!uuidRegex.test(channelName)) {
        return new Response(JSON.stringify({ error: "Invalid channelName format (must be matchId)" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const { data: matchData, error: matchError } = await supabaseClient
        .from("matches")
        .select("id")
        .eq("id", channelName)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle();

      if (!matchError && matchData) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Forbidden: Not a participant in this room" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const appId = Deno.env.get("AGORA_APP_ID");
    const appCertificate = Deno.env.get("AGORA_APP_CERTIFICATE");
    if (!appId || !appCertificate) throw new Error("Agora credentials not configured");

    const role = RtcRole.PUBLISHER;
    const tokenExpirationInSeconds = 300; // 5 minutes
    const privilegeExpirationInSeconds = 300;

    const agoraToken = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid || 0,
      role,
      tokenExpirationInSeconds,
      privilegeExpirationInSeconds
    );

    return new Response(
      JSON.stringify({ token: agoraToken, appId, channelName, uid: uid || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

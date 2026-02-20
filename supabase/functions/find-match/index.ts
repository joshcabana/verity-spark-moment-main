import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FindMatchRequest {
  roomId?: string;
  isWarmup?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey) {
    return new Response(JSON.stringify({ error: "Supabase environment is not configured" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }

  let monitorClient: ReturnType<typeof createClient> | null = null;
  if (serviceRoleKey) {
    monitorClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  }

  try {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      if (monitorClient) {
        await monitorClient.rpc("log_runtime_alert_event", {
          p_event_source: "find-match",
          p_event_type: "auth_rejected",
          p_severity: "warning",
          p_status_code: 401,
          p_details: { message: userError?.message ?? "User not found from JWT" },
        });
      }
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { roomId, isWarmup } = (await req.json()) as FindMatchRequest;
    if (!roomId) {
      return new Response(JSON.stringify({ error: "Missing roomId" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { data, error } = await userClient.rpc("rpc_enter_matchmaking", {
      p_room_id: roomId,
      p_is_warmup: Boolean(isWarmup),
    });

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (monitorClient) {
      await monitorClient.rpc("log_runtime_alert_event", {
        p_event_source: "find-match",
        p_event_type: "rpc_exception",
        p_severity: "error",
        p_status_code: 500,
        p_details: { message },
      });
    }

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

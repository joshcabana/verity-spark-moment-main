import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_DEFAULT_ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_DEFAULT_MODEL = "google/gemini-3-flash-preview";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_ATTEMPTS_PER_WINDOW = 5;
const WINDOW_MINUTES = 10;

interface VerifySelfieRequest {
  imageBase64?: string;
}

interface VerifySelfieToolResult {
  is_live_person: boolean;
  face_visible: boolean;
  single_person: boolean;
  appears_adult: boolean;
  confidence: number;
  reason: string;
}

const parseToolResult = (raw: unknown): VerifySelfieToolResult | null => {
  const response = raw as {
    choices?: Array<{
      message?: {
        tool_calls?: Array<{
          function?: { arguments?: string };
        }>;
      };
    }>;
  };

  const args = response.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return null;

  try {
    const parsed = JSON.parse(args) as VerifySelfieToolResult;
    if (
      typeof parsed.is_live_person === "boolean" &&
      typeof parsed.face_visible === "boolean" &&
      typeof parsed.single_person === "boolean" &&
      typeof parsed.appears_adult === "boolean" &&
      typeof parsed.confidence === "number" &&
      typeof parsed.reason === "string"
    ) {
      return parsed;
    }
  } catch {
    // ignore invalid tool payload
  }

  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let monitorClient: ReturnType<typeof createClient> | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Supabase environment is not configured");
    }

    monitorClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      await monitorClient.rpc("log_runtime_alert_event", {
        p_event_source: "verify-selfie",
        p_event_type: "auth_rejected",
        p_severity: "warning",
        p_status_code: 401,
        p_details: { reason: authError?.message ?? "No user from token" },
      });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageBase64 } = (await req.json()) as VerifySelfieRequest;
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const estimatedBytes = Math.ceil((imageBase64.length * 3) / 4);
    if (estimatedBytes > MAX_IMAGE_BYTES) {
      await monitorClient.rpc("log_runtime_alert_event", {
        p_event_source: "verify-selfie",
        p_event_type: "payload_rejected",
        p_severity: "warning",
        p_status_code: 413,
        p_user_id: user.id,
        p_details: { estimatedBytes, maxBytes: MAX_IMAGE_BYTES },
      });
      return new Response(JSON.stringify({ error: "Image too large. Maximum 5MB." }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

    const { count: attemptsCount, error: rateError } = await supabase
      .from("selfie_verification_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("attempted_at", windowStart);

    if (rateError) {
      throw rateError;
    }

    if ((attemptsCount ?? 0) >= MAX_ATTEMPTS_PER_WINDOW) {
      await monitorClient.rpc("log_runtime_alert_event", {
        p_event_source: "verify-selfie",
        p_event_type: "rate_limited",
        p_severity: "warning",
        p_status_code: 429,
        p_user_id: user.id,
        p_details: { attemptsCount, windowMinutes: WINDOW_MINUTES, maxAttempts: MAX_ATTEMPTS_PER_WINDOW },
      });
      return new Response(
        JSON.stringify({
          error: `Rate limit exceeded. Try again in ${WINDOW_MINUTES} minutes.`,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    await supabase.from("selfie_verification_attempts").insert({
      user_id: user.id,
    });

    const aiApiKey = Deno.env.get("AI_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY");
    if (!aiApiKey) {
      await monitorClient.rpc("log_runtime_alert_event", {
        p_event_source: "verify-selfie",
        p_event_type: "misconfigured_env",
        p_severity: "error",
        p_status_code: 503,
        p_user_id: user.id,
        p_details: { missingSecret: "AI_API_KEY|LOVABLE_API_KEY" },
      });
      return new Response(JSON.stringify({ error: "Selfie verification service is not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiEndpoint = Deno.env.get("AI_API_BASE_URL") ?? AI_DEFAULT_ENDPOINT;
    const aiModel = Deno.env.get("AI_API_MODEL") ?? AI_DEFAULT_MODEL;

    const response = await fetch(aiEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          {
            role: "system",
            content: `You are a selfie liveness verification system for a dating app called Verity. Your job is to analyze a selfie image and determine:
1. Is this a real person (not a photo of a photo, screenshot, deepfake, or printed image)?
2. Is the face clearly visible and well-lit?
3. Is only one person in the frame?
4. Does the person appear to be an adult (18+)?

You MUST respond using the verify_selfie tool.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this selfie for liveness verification. Check if it's a real live person, well-lit, single face, and appears adult.",
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "verify_selfie",
              description: "Return the liveness verification result",
              parameters: {
                type: "object",
                properties: {
                  is_live_person: { type: "boolean" },
                  face_visible: { type: "boolean" },
                  single_person: { type: "boolean" },
                  appears_adult: { type: "boolean" },
                  confidence: { type: "number" },
                  reason: { type: "string" },
                },
                required: ["is_live_person", "face_visible", "single_person", "appears_adult", "confidence", "reason"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "verify_selfie" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const details = await response.text();
      console.error("verify-selfie AI error:", response.status, details);
      throw new Error("AI verification failed");
    }

    const verification = parseToolResult(await response.json());
    if (!verification) {
      return new Response(
        JSON.stringify({
          passed: false,
          reason: "Could not analyze image. Please try again with better lighting.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const passed =
      verification.is_live_person &&
      verification.face_visible &&
      verification.single_person &&
      verification.appears_adult &&
      verification.confidence >= 0.7;

    return new Response(
      JSON.stringify({
        passed,
        confidence: verification.confidence,
        reason: verification.reason,
        details: {
          is_live_person: verification.is_live_person,
          face_visible: verification.face_visible,
          single_person: verification.single_person,
          appears_adult: verification.appears_adult,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    if (monitorClient) {
      await monitorClient.rpc("log_runtime_alert_event", {
        p_event_source: "verify-selfie",
        p_event_type: "execution_error",
        p_severity: "error",
        p_status_code: 500,
        p_details: { message: error instanceof Error ? error.message : String(error) },
      });
    }

    console.error("verify-selfie error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

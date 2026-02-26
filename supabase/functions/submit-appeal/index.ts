import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_DEFAULT_ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_DEFAULT_MODEL = "google/gemini-3-flash-preview";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Supabase environment is not configured");
    }

    const token = authHeader.replace("Bearer ", "");

    // Use service-role client to verify token and get user identity
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData?.user) {
      await adminClient.rpc("log_runtime_alert_event", {
        p_event_source: "submit-appeal",
        p_event_type: "auth_rejected",
        p_severity: "warning",
        p_status_code: 401,
        p_details: { reason: userError?.message ?? "No user from token" },
      }).catch(() => {});
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { moderationEventId, appealText } = await req.json();
    if (!moderationEventId) {
      return new Response(JSON.stringify({ error: "Missing moderation event ID" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = adminClient;

    // Verify the moderation event belongs to this user
    const { data: event } = await supabase
      .from("moderation_events")
      .select("*")
      .eq("id", moderationEventId)
      .eq("offender_id", userId)
      .single();
    if (!event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if appeal already exists
    const { data: existing } = await supabase
      .from("appeals")
      .select("id")
      .eq("moderation_event_id", moderationEventId)
      .eq("user_id", userId)
      .single();
    if (existing) {
      return new Response(JSON.stringify({ error: "Appeal already submitted" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create appeal
    const { data: appeal, error: appealError } = await supabase
      .from("appeals")
      .insert({
        moderation_event_id: moderationEventId,
        user_id: userId,
        appeal_text: appealText || "",
        status: "pending",
      })
      .select()
      .single();
    if (appealError) throw appealError;

    // Use AI to auto-review the appeal for false positives
    const aiApiKey = Deno.env.get("AI_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY");
    if (aiApiKey) {
      const aiEndpoint = Deno.env.get("AI_API_BASE_URL") ?? AI_DEFAULT_ENDPOINT;
      const aiModel = Deno.env.get("AI_API_MODEL") ?? AI_DEFAULT_MODEL;
      try {
        const aiResponse = await fetch(aiEndpoint, {
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
                content: "You review moderation appeals for a dating video call app. Given the original AI moderation result and the user's appeal text, determine if this was likely a false positive. Be fair but safety-first. Respond using the review_appeal tool."
              },
              {
                role: "user",
                content: `Original violation: ${event.category} (confidence: ${event.confidence}, tier: ${event.tier})\nAI reasoning: ${event.ai_reasoning}\nUser appeal: ${appealText || "No text provided"}`
              }
            ],
            tools: [{
              type: "function",
              function: {
                name: "review_appeal",
                description: "Return the appeal review decision",
                parameters: {
                  type: "object",
                  properties: {
                    likely_false_positive: { type: "boolean" },
                    recommendation: { type: "string", enum: ["overturn", "uphold", "escalate"] },
                    reasoning: { type: "string" }
                  },
                  required: ["likely_false_positive", "recommendation", "reasoning"],
                  additionalProperties: false
                }
              }
            }],
            tool_choice: { type: "function", function: { name: "review_appeal" } }
          }),
        });
        if (aiResponse.ok) {
          const aiResult = await aiResponse.json();
          const reviewCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
          if (reviewCall) {
            const review = JSON.parse(reviewCall.function.arguments);
            if (review.recommendation === "overturn") {
              // Auto-overturn: update appeal, lift ban, award apology tokens
              await supabase.from("appeals").update({
                status: "overturned",
                resolution_text: `AI review: ${review.reasoning}`,
                apology_tokens_awarded: 2,
                resolved_at: new Date().toISOString(),
              }).eq("id", appeal.id);
              await supabase.from("moderation_events").update({
                reviewed: true,
                reviewed_by: "ai_auto_review",
                reviewed_at: new Date().toISOString(),
                review_outcome: "overturned",
              }).eq("id", moderationEventId);
              // Lift any active ban
              await supabase.from("user_bans").update({
                lifted_at: new Date().toISOString(),
              }).eq("user_id", userId).is("lifted_at", null);
              // Award apology tokens
              const { error: incrementError } = await supabase.rpc("increment_user_tokens", {
                p_user_id: userId,
                p_delta: 2,
                p_type: "refund",
                p_description: "Apology tokens for overturned moderation action",
              });
              if (incrementError) {
                await supabase.rpc("log_runtime_alert_event", {
                  p_event_source: "submit-appeal",
                  p_event_type: "rpc_exception",
                  p_severity: "error",
                  p_status_code: 500,
                  p_user_id: userId,
                  p_details: { rpc: "increment_user_tokens", message: incrementError.message },
                });
                throw incrementError;
              }
              return new Response(JSON.stringify({
                success: true,
                status: "overturned",
                message: "Your appeal was reviewed and overturned. 2 apology tokens have been added to your account.",
                apologyTokens: 2,
              }), {
                status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }
        }
      } catch (aiErr) {
        console.error("AI appeal review failed, will default to human review:", aiErr);
      }
    }

    // Default: pending human review
    return new Response(JSON.stringify({
      success: true,
      status: "pending",
      message: "Your appeal has been submitted and will be reviewed within 5 minutes.",
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("submit-appeal error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await supabase.rpc("log_runtime_alert_event", {
      p_event_source: "submit-appeal",
      p_event_type: "execution_error",
      p_severity: "error",
      p_status_code: 500,
      p_details: { message: errorMessage },
    });
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

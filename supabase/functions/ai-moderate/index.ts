import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Tier = 0 | 1 | 2;
type Action = "none" | "log" | "warning" | "terminate";

interface ModerateRequest {
  frameBase64?: string;
  audioBase64?: string;
  matchId?: string;
  victimId?: string;
  callId?: string;
}

interface ModerationToolResult {
  category: string;
  confidence: number;
  tier: Tier;
  reasoning: string;
  transcript?: string;
}

interface StoredMatch {
  id: string;
  user1_id: string;
  user2_id: string;
}

const parseToolResult = (raw: unknown): ModerationToolResult | null => {
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
    const parsed = JSON.parse(args) as ModerationToolResult;
    if (
      typeof parsed.category === "string" &&
      typeof parsed.confidence === "number" &&
      typeof parsed.tier === "number" &&
      typeof parsed.reasoning === "string"
    ) {
      return parsed;
    }
  } catch {
    // ignore malformed tool payload
  }

  return null;
};

const callLovableModeration = async (body: Record<string, unknown>, apiKey: string) => {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) return null;
  return parseToolResult(await response.json());
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
        p_event_source: "ai-moderate",
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

    const { frameBase64, audioBase64, matchId, victimId: reqVictimId, callId } = (await req.json()) as ModerateRequest;
    if (!frameBase64 && !audioBase64) {
      return new Response(JSON.stringify({ error: "Missing media payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const offenderId = user.id;
    let victimId = reqVictimId ?? null;

    if (matchId) {
      const { data: match, error: matchError } = await supabase
        .from("matches")
        .select("id,user1_id,user2_id")
        .eq("id", matchId)
        .single();

      if (matchError || !match) {
        return new Response(JSON.stringify({ error: "Match not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const typedMatch = match as StoredMatch;
      if (typedMatch.user1_id !== offenderId && typedMatch.user2_id !== offenderId) {
        await monitorClient.rpc("log_runtime_alert_event", {
          p_event_source: "ai-moderate",
          p_event_type: "auth_rejected",
          p_severity: "warning",
          p_status_code: 403,
          p_user_id: offenderId,
          p_details: { reason: "User is not a participant in provided matchId", matchId },
        });
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      victimId = typedMatch.user1_id === offenderId ? typedMatch.user2_id : typedMatch.user1_id;
    }

    const startTime = Date.now();

    const videoResult = frameBase64
      ? await callLovableModeration(
          {
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `You are Verity's real-time video call moderation system. Analyze each video frame for policy violations.

Detection categories:
- nudity: Any sexual exposure, genitalia, explicit nudity. Threshold >0.90 = Tier 0 (instant terminate)
- harassment: Threatening gestures, aggressive posturing, hate symbols. >0.90 = Tier 0
- inappropriate_gesture: Offensive hand gestures. 0.70-0.90 = Tier 1 (warning)
- weapon: Visible weapons or threats. >0.90 = Tier 0
- minor_concern: Person appears underage. >0.80 = Tier 0
- scam_indicator: Written text showing crypto/money solicitation. 0.70-0.90 = Tier 1
- safe: No violations detected.

Tier 0 = instant call termination + ban. Tier 1 = warning overlay to offender only.
Be conservative: only flag clear violations. Innocent activities must NOT trigger false positives.
You MUST respond using the moderate_frame tool.`,
              },
              {
                role: "user",
                content: [
                  { type: "text", text: "Moderate this video call frame for policy violations." },
                  { type: "image_url", image_url: { url: `data:image/jpeg;base64,${frameBase64}` } },
                ],
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "moderate_frame",
                  description: "Return moderation result for the video frame",
                  parameters: {
                    type: "object",
                    properties: {
                      category: {
                        type: "string",
                        enum: ["nudity", "harassment", "inappropriate_gesture", "weapon", "minor_concern", "scam_indicator", "safe"],
                      },
                      confidence: { type: "number" },
                      tier: { type: "integer", enum: [0, 1, 2] },
                      reasoning: { type: "string" },
                    },
                    required: ["category", "confidence", "tier", "reasoning"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "moderate_frame" } },
          },
          lovableApiKey,
        )
      : null;

    const audioResult = audioBase64
      ? await callLovableModeration(
          {
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `You are an audio moderation system for a video dating app. Analyze the provided audio segment for:

1. Verbal harassment: slurs, threats, hate speech, sexual harassment
2. Aggressive tone/prosody: shouting, hostile intonation patterns
3. Scam language: requests for money, crypto pitches, personal info solicitation
4. Age concerns: voice patterns suggesting a minor

Categories:
- verbal_harassment: Slurs, threats, hate speech. >0.90 = Tier 0
- aggressive_tone: Shouting, hostile delivery. 0.70-0.90 = Tier 1
- scam_language: Money/crypto solicitation. 0.70-0.90 = Tier 1
- minor_voice: Voice suggesting underage person. >0.80 = Tier 0
- safe: Normal conversation

Be conservative. Passionate discussion ≠ aggression. Respond using the moderate_audio tool.`,
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Analyze this audio clip from a video call for safety violations. Transcribe it and assess tone/content.",
                  },
                  { type: "image_url", image_url: { url: `data:audio/webm;base64,${audioBase64}` } },
                ],
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "moderate_audio",
                  description: "Return moderation result for the audio segment",
                  parameters: {
                    type: "object",
                    properties: {
                      category: {
                        type: "string",
                        enum: ["verbal_harassment", "aggressive_tone", "scam_language", "minor_voice", "safe"],
                      },
                      confidence: { type: "number" },
                      tier: { type: "integer", enum: [0, 1, 2] },
                      transcript: { type: "string" },
                      reasoning: { type: "string" },
                    },
                    required: ["category", "confidence", "tier", "transcript", "reasoning"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "moderate_audio" } },
          },
          lovableApiKey,
        )
      : null;

    const latencyMs = Date.now() - startTime;

    let finalResult: ModerationToolResult & { action: Action } = {
      category: "safe",
      confidence: 0,
      tier: 2,
      reasoning: "No violations",
      action: "none",
    };

    for (const result of [videoResult, audioResult]) {
      if (!result || result.category === "safe" || result.confidence < 0.7) continue;
      if (
        result.tier < finalResult.tier ||
        (result.tier === finalResult.tier && result.confidence > finalResult.confidence)
      ) {
        finalResult = { ...result, action: "log" };
      }
    }

    if (finalResult.category !== "safe" && finalResult.confidence >= 0.7) {
      if (finalResult.tier === 0 && finalResult.confidence >= 0.9) {
        finalResult.action = "terminate";
      } else if (finalResult.tier === 1 || (finalResult.confidence >= 0.7 && finalResult.confidence < 0.9)) {
        finalResult.action = "warning";
      }
    }

    if (finalResult.action === "none") {
      return new Response(JSON.stringify({ action: "none", category: "safe", latencyMs }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let clipUrl: string | null = null;
    const clipExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (frameBase64 && (finalResult.action === "terminate" || finalResult.action === "warning")) {
      const clipFileName = `${offenderId}/${Date.now()}-${finalResult.category}.jpg`;
      const clipBytes = Uint8Array.from(atob(frameBase64), (char) => char.charCodeAt(0));

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("moderation-clips")
        .upload(clipFileName, clipBytes, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (!uploadError && uploadData) {
        clipUrl = uploadData.path;
      } else {
        console.error("Clip upload error:", uploadError);
      }
    }

    const combinedReasoning = [
      videoResult && videoResult.category !== "safe" ? `Video: ${videoResult.reasoning}` : null,
      audioResult && audioResult.category !== "safe" ? `Audio: ${audioResult.reasoning}${audioResult.transcript ? ` [Transcript: "${audioResult.transcript}"]` : ""}` : null,
    ]
      .filter((part): part is string => Boolean(part))
      .join(" | ") || finalResult.reasoning;

    const { error: insertError } = await supabase.from("moderation_events").insert({
      match_id: matchId ?? null,
      call_id: callId ?? null,
      offender_id: offenderId,
      victim_id: victimId,
      tier: finalResult.tier,
      category: finalResult.category,
      confidence: finalResult.confidence,
      action_taken: finalResult.action,
      ai_reasoning: combinedReasoning,
      clip_url: clipUrl,
      clip_expires_at: clipUrl ? clipExpiresAt : null,
    });

    if (insertError) {
      console.error("Failed to log moderation event:", insertError);
    }

    if (finalResult.action === "terminate") {
      await supabase.from("user_bans").insert({
        user_id: offenderId,
        reason: `Tier 0 violation: ${finalResult.category} (confidence: ${finalResult.confidence})`,
        ban_type: "temporary",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    const today = new Date().toISOString().split("T")[0];
    const { data: existingStats } = await supabase
      .from("moderation_stats")
      .select("tier0_actions,tier1_warnings,avg_latency_ms,total_calls,violation_free_calls")
      .eq("date", today)
      .single();

    if (existingStats) {
      const updates: Record<string, number | string> = {
        updated_at: new Date().toISOString(),
        total_calls: (existingStats.total_calls ?? 0) + 1,
      };

      if (finalResult.action === "terminate") {
        updates.tier0_actions = (existingStats.tier0_actions ?? 0) + 1;
      } else if (finalResult.action === "warning") {
        updates.tier1_warnings = (existingStats.tier1_warnings ?? 0) + 1;
      } else {
        updates.violation_free_calls = (existingStats.violation_free_calls ?? 0) + 1;
      }

      updates.avg_latency_ms = Math.round(((existingStats.avg_latency_ms ?? 0) + latencyMs) / 2);
      await supabase.from("moderation_stats").update(updates).eq("date", today);
    } else {
      await supabase.from("moderation_stats").insert({
        date: today,
        total_calls: 1,
        violation_free_calls: finalResult.action === "log" ? 0 : 1,
        tier0_actions: finalResult.action === "terminate" ? 1 : 0,
        tier1_warnings: finalResult.action === "warning" ? 1 : 0,
        avg_latency_ms: latencyMs,
      });
    }

    return new Response(
      JSON.stringify({
        action: finalResult.action,
        category: finalResult.category,
        confidence: finalResult.confidence,
        tier: finalResult.tier,
        reasoning: combinedReasoning,
        latencyMs,
        audioAnalysis: audioResult
          ? {
              category: audioResult.category,
              transcript: audioResult.transcript ?? "",
              confidence: audioResult.confidence,
            }
          : null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    if (monitorClient) {
      await monitorClient.rpc("log_runtime_alert_event", {
        p_event_source: "ai-moderate",
        p_event_type: "execution_error",
        p_severity: "error",
        p_status_code: 500,
        p_details: { message: error instanceof Error ? error.message : String(error) },
      });
    }

    console.error("ai-moderate error:", error);
    return new Response(
      JSON.stringify({
        action: "none",
        error: error instanceof Error ? error.message : "Unknown",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

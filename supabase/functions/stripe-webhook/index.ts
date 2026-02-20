import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOKEN_PACK_MAP: Record<string, number> = {
  "price_1T2B8ZHHJNu8TYH7wfh5fdNv": 10,
  "price_1T2B8rHHJNu8TYH7lnqB0oGV": 15,
  "price_1T2B96HHJNu8TYH7e2Tikj7C": 30,
};

const log = (step: string, details?: unknown) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeSecret || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Webhook environment is not fully configured" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  let eventId: string | null = null;

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("Missing stripe-signature header");

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    eventId = event.id;
    log("Event received", { type: event.type, id: event.id });

    const { data: existingEvent } = await supabase
      .from("stripe_events")
      .select("event_id,status")
      .eq("event_id", event.id)
      .maybeSingle();

    if (existingEvent?.status === "processed") {
      log("Duplicate event ignored", { id: event.id, status: existingEvent.status });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (existingEvent?.status === "processing") {
      log("Event already processing", { id: event.id });
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!existingEvent) {
      const { error: claimError } = await supabase.from("stripe_events").insert({
        event_id: event.id,
        event_type: event.type,
        status: "processing",
        payload: JSON.parse(body),
      });

      if (claimError) throw claimError;
    } else {
      await supabase
        .from("stripe_events")
        .update({
          status: "processing",
          error: null,
          event_type: event.type,
          payload: JSON.parse(body),
        })
        .eq("event_id", event.id);
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (!userId) {
          log("No user_id in session metadata, skipping");
          break;
        }

        if (session.mode === "payment") {
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
          const priceId = lineItems.data[0]?.price?.id;
          const tokenAmount = priceId ? TOKEN_PACK_MAP[priceId] : null;

          if (tokenAmount) {
            log("Crediting tokens", { userId, tokenAmount, priceId });

            const { error: incrementError } = await supabase.rpc("increment_user_tokens", {
              p_user_id: userId,
              p_delta: tokenAmount,
              p_type: "purchase",
              p_description: `Purchased ${tokenAmount} tokens`,
            });

            if (incrementError) throw incrementError;
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string | null;
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const customerId = subscription.customer as string;
        const customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
        const email = customer.email;
        if (!email) break;

        const { data: usersResponse, error: usersError } = await supabase.auth.admin.listUsers();
        if (usersError) throw usersError;

        const appUser = usersResponse.users.find((candidate) => candidate.email === email);
        if (!appUser) {
          log("No app user found for Stripe customer email", { email });
          break;
        }

        const { error: upsertError } = await supabase
          .from("subscriptions")
          .upsert(
            {
              user_id: appUser.id,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              status: "active",
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            },
            { onConflict: "user_id" },
          );

        if (upsertError) throw upsertError;
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await supabase
          .from("subscriptions")
          .update({ status: "cancelled" })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      default:
        log("Unhandled event type", { type: event.type });
    }

    await supabase
      .from("stripe_events")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
        error: null,
      })
      .eq("event_id", event.id);

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = toErrorMessage(error);
    log("ERROR", { message, eventId });

    if (eventId) {
      await supabase
        .from("stripe_events")
        .update({
          status: "failed",
          error: message,
        })
        .eq("event_id", eventId);
    }

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

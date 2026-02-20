// Webhook Stripe : synchronise les achats (test ou réel) avec la table subscriptions.
// Débloque les options du forfait dès qu'un abonnement est créé (Stripe ou admin).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

function getPriceToPlanMap(): Record<string, string> {
  const raw = Deno.env.get("STRIPE_PRICE_TO_PLAN_JSON");
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

async function findUserIdByEmail(supabaseAdmin: ReturnType<typeof createClient>, email: string): Promise<string | null> {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error || !users?.length) return null;
  const u = users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
  return u?.id ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!webhookSecret || !stripeSecret || !supabaseUrl || !serviceRoleKey) {
    console.error("Missing STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY, SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: string;
  try {
    body = await req.text();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(stripeSecret);
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const priceToPlan = getPriceToPlanMap();
  if (Object.keys(priceToPlan).length === 0) {
    console.warn("STRIPE_PRICE_TO_PLAN_JSON not set or empty; webhook will not sync plans.");
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = (session.metadata || {}) as Record<string, string>;
    const userIdFromRef = (session.client_reference_id ?? metadata.user_id ?? "").trim() || null;
    const email = (session.customer_details?.email ?? (session as { customer_email?: string }).customer_email ?? "").trim() || null;

    let user_id: string | null = userIdFromRef || null;
    if (!user_id && email) {
      user_id = await findUserIdByEmail(supabaseAdmin, email);
    }
    if (!user_id) {
      console.error("checkout.session.completed: no user_id (client_reference_id or email)", { email });
      return new Response(JSON.stringify({ received: true, warning: "user not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Achat de crédits analyses IA (mode payment)
    if (session.mode === "payment" && metadata.type === "ai_credits") {
      const creditsStr = metadata.credits_amount || "0";
      const creditsAmount = parseInt(creditsStr, 10) || 0;
      if (creditsAmount > 0) {
        const { data, error } = await supabaseAdmin.rpc("add_bonus_ai_credits", {
          p_user_id: user_id,
          p_amount: creditsAmount,
        });
        if (error) {
          console.error("add_bonus_ai_credits error:", error);
        } else {
          console.log("Credits added:", creditsAmount, "for user", user_id, "-> total", data);
        }
      }
      return new Response(JSON.stringify({ received: true, type: "ai_credits", user_id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let plan_id: string | null = null;
    const stripe = new Stripe(stripeSecret);
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
    if (subscriptionId && session.mode === "subscription") {
      const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price"] });
      const priceId = (sub.items?.data?.[0]?.price as Stripe.Price | undefined)?.id ?? null;
      if (priceId && priceToPlan[priceId]) plan_id = priceToPlan[priceId];
    }
    if (!plan_id && session.id) {
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, { expand: ["line_items.data.price"] });
      const lineItems = fullSession.line_items?.data;
      const priceId = (lineItems?.[0]?.price as Stripe.Price | undefined)?.id ?? null;
      if (priceId && priceToPlan[priceId]) plan_id = priceToPlan[priceId];
    }

    if (!plan_id) {
      console.warn("checkout.session.completed: no plan mapping for this price; set STRIPE_PRICE_TO_PLAN_JSON");
      return new Response(JSON.stringify({ received: true, warning: "no plan mapping" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
    const stripeSubId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;

    let periodStart = new Date().toISOString();
    let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    if (stripeSubId) {
      try {
        const sub = await stripe.subscriptions.retrieve(stripeSubId);
        periodStart = sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : periodStart;
        periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : periodEnd;
      } catch (_) {}
    }

    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("user_id", user_id)
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    const updatePayload = {
      plan_id,
      status: "active",
      billing_cycle: "monthly",
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancelled_at: null,
      cancel_at: null,
      stripe_customer_id: customerId,
      stripe_subscription_id: stripeSubId,
    };

    if (existing) {
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .update(updatePayload)
        .eq("id", existing.id);
      if (error) {
        console.error("subscriptions update error:", error);
        return new Response(JSON.stringify({ error: "Database error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .insert({
          user_id,
          plan_id,
          status: "active",
          billing_cycle: "monthly",
          start_date: periodStart,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          stripe_customer_id: customerId,
          stripe_subscription_id: stripeSubId,
        });
      if (error) {
        console.error("subscriptions insert error:", error);
        return new Response(JSON.stringify({ error: "Database error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ received: true, user_id, plan_id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const metadata = sub.metadata as Record<string, string> | null;
    const userIdFromMeta = metadata?.user_id?.trim() || null;
    const stripeSubId = sub.id;
    const isDeleted = event.type === "customer.subscription.deleted" || sub.status === "canceled" || sub.status === "unpaid";
    const cancelAt = sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null;
    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

    const updateData: Record<string, unknown> = {
      current_period_end: periodEnd || undefined,
      cancel_at: sub.cancel_at_period_end ? cancelAt : null,
      status: isDeleted ? "cancelled" : sub.status === "active" ? "active" : "paused",
      cancelled_at: isDeleted ? new Date().toISOString() : null,
    };

    // 1. Match by stripe_subscription_id
    const { data: byStripeId } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("stripe_subscription_id", stripeSubId)
      .limit(1)
      .maybeSingle();

    if (byStripeId) {
      await supabaseAdmin.from("subscriptions").update(updateData).eq("id", byStripeId.id);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fallback: match by user_id (metadata or customer email)
    let uid = userIdFromMeta;
    if (!uid && sub.customer) {
      const stripe = new Stripe(stripeSecret);
      const customer = await stripe.customers.retrieve(sub.customer as string);
      if (!customer.deleted && "email" in customer && customer.email) {
        uid = await findUserIdByEmail(supabaseAdmin, customer.email);
      }
    }
    if (uid) {
      const { data: existing } = await supabaseAdmin
        .from("subscriptions")
        .select("id")
        .eq("user_id", uid)
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) {
        await supabaseAdmin
          .from("subscriptions")
          .update({ ...updateData, stripe_subscription_id: stripeSubId })
          .eq("id", existing.id);
      }
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

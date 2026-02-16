import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-runtime",
};

function ok() {
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(null, { status: 405, headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeSecretKey) {
    console.error("STRIPE_SECRET_KEY manquant");
    return new Response(JSON.stringify({ error: "Configuration manquante" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET manquant — configure le webhook dans le Dashboard Stripe");
    return new Response(JSON.stringify({ error: "Webhook non configuré" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Signature manquante" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return new Response(JSON.stringify({ error: "Corps invalide" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-06-20",
  });
  const cryptoProvider = Stripe.createSubtleCryptoProvider();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signature invalide";
    console.error("Webhook signature verification failed:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY manquant");
    return new Response(JSON.stringify({ error: "Configuration serveur manquante" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = (session.metadata?.user_id ?? session.client_reference_id) as string | null;
      const planId = session.metadata?.plan_id as string | null;
      const billingCycle = session.metadata?.billing_cycle as string | null;

      const amountTotal = session.amount_total ?? 0;
      const currency = (session.currency ?? "cad").toLowerCase();
      const paymentStatus = session.payment_status === "paid" ? "succeeded" : "pending";

      await supabase.from("payments").insert({
        provider_id: session.id,
        payment_method: "stripe",
        amount: amountTotal / 100,
        currency,
        status: paymentStatus,
        user_id: userId ?? null,
        subscription_id: null,
        invoice_url: null,
      });

      if (userId && planId && billingCycle) {
        let periodStart: string;
        let periodEnd: string;
        let stripeSubscriptionId: string | null = null;

        if (session.subscription && typeof session.subscription === "string") {
          stripeSubscriptionId = session.subscription;
          try {
            const sub = await stripe.subscriptions.retrieve(session.subscription);
            periodStart = new Date((sub.current_period_start ?? 0) * 1000).toISOString().slice(0, 10);
            periodEnd = new Date((sub.current_period_end ?? 0) * 1000).toISOString().slice(0, 10);
          } catch {
            const start = new Date();
            periodStart = start.toISOString().slice(0, 10);
            periodEnd =
              billingCycle === "yearly"
                ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
          }
        } else {
          const start = new Date();
          periodStart = start.toISOString().slice(0, 10);
          periodEnd =
            billingCycle === "yearly"
              ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        }

        const row: Record<string, unknown> = {
          user_id: userId,
          plan_id: planId,
          billing_cycle: billingCycle,
          status: "active",
          start_date: periodStart,
          current_period_start: periodStart,
          current_period_end: periodEnd,
        };
        if (stripeSubscriptionId) {
          row.stripe_subscription_id = stripeSubscriptionId;
        }
        const { error: subError } = await supabase.from("subscriptions").insert(row);
        if (subError) console.error("Insert subscription error (non bloquant):", subError);
      }
      return ok();
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      if (!subId) return ok();

      const amountTotal = invoice.amount_paid ?? invoice.amount_due ?? 0;
      const currency = (invoice.currency ?? "cad").toLowerCase();

      let userId: string | null = null;
      let subscriptionRowId: string | null = null;
      const { data: subRows } = await supabase
        .from("subscriptions")
        .select("id, user_id")
        .eq("stripe_subscription_id", subId)
        .limit(1);
      if (subRows?.[0]) {
        subscriptionRowId = subRows[0].id;
        userId = subRows[0].user_id;
      }

      await supabase.from("payments").insert({
        provider_id: invoice.id,
        payment_method: "stripe",
        amount: amountTotal / 100,
        currency,
        status: "succeeded",
        user_id: userId,
        subscription_id: subscriptionRowId,
        invoice_url: invoice.hosted_invoice_url ?? null,
      });

      if (subscriptionRowId && invoice.lines?.data?.[0]) {
        const periodEnd = invoice.lines.data[0].period?.end;
        if (periodEnd) {
          const endDate = new Date(periodEnd * 1000).toISOString().slice(0, 10);
          await supabase
            .from("subscriptions")
            .update({
              current_period_end: endDate,
              current_period_start: new Date((invoice.lines.data[0].period?.start ?? 0) * 1000).toISOString().slice(0, 10),
              updated_at: new Date().toISOString(),
            })
            .eq("id", subscriptionRowId);
        }
      }
      return ok();
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const periodStart = sub.current_period_start
        ? new Date(sub.current_period_start * 1000).toISOString().slice(0, 10)
        : null;
      const periodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString().slice(0, 10)
        : null;
      const status =
        sub.status === "active" || sub.status === "trialing"
          ? "active"
          : sub.status === "canceled" || sub.status === "unpaid"
            ? "cancelled"
            : "past_due";

      await supabase
        .from("subscriptions")
        .update({
          current_period_start: periodStart,
          current_period_end: periodEnd,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", sub.id);
      return ok();
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await supabase
        .from("subscriptions")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", sub.id);
      return ok();
    }

    default:
      return ok();
  }
});

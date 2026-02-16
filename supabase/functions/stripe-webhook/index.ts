import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-runtime",
};

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

  if (event.type !== "checkout.session.completed") {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const userId = (session.metadata?.user_id ?? session.client_reference_id) as string | null;
  const planId = session.metadata?.plan_id as string | null;
  const billingCycle = session.metadata?.billing_cycle as string | null;

  const amountTotal = session.amount_total ?? 0;
  const currency = (session.currency ?? "cad").toLowerCase();
  const paymentStatus = session.payment_status === "paid" ? "completed" : session.payment_status ?? "unknown";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY manquant pour enregistrer le paiement");
    return new Response(JSON.stringify({ error: "Configuration serveur manquante" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { error: insertError } = await supabase.from("payments").insert({
    provider_id: session.id,
    payment_method: "stripe",
    amount: amountTotal / 100,
    currency,
    status: paymentStatus,
    user_id: userId ?? null,
    subscription_id: null,
    invoice_url: null,
  });

  if (insertError) {
    console.error("Insert payment error:", insertError);
    return new Response(
      JSON.stringify({ error: "Erreur lors de l'enregistrement du paiement" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (userId && planId && billingCycle) {
    const startDate = new Date().toISOString().slice(0, 10);
    const { error: subError } = await supabase.from("subscriptions").insert({
      user_id: userId,
      plan_id: planId,
      billing_cycle: billingCycle,
      status: "active",
      start_date: startDate,
      current_period_start: startDate,
      current_period_end:
        billingCycle === "yearly"
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });
    if (subError) {
      console.error("Insert subscription error (non bloquant):", subError);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

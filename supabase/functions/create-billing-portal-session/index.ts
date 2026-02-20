// Crée une session Stripe Billing Portal (gérer paiement, annuler abonnement à la fin du cycle).
// Env: STRIPE_SECRET_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!stripeSecret || !supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { return_url?: string; locale?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const siteUrl = (Deno.env.get("SITE_URL") || "https://www.monprojetmaison.ca").replace(/\/$/, "");
  const baseUrl = siteUrl.replace(/^https?:\/\/monprojetmaison\.ca$/, "https://www.monprojetmaison.ca");
  const returnUrl = body.return_url || `${baseUrl}/#/forfaits`;
  const locale = (body.locale === "en" || body.locale === "fr") ? body.locale : "fr";

  const stripe = new Stripe(stripeSecret);

  // 1. Get stripe_customer_id from subscription
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .in("status", ["active", "trial", "paused", "past_due"])
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  let customerId = (sub as { stripe_customer_id?: string } | null)?.stripe_customer_id ?? null;

  // 2. Fallback: find Stripe customer by email
  if (!customerId && user.email) {
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data?.length) {
      customerId = customers.data[0].id;
    }
  }

  if (!customerId) {
    return new Response(
      JSON.stringify({ error: "Aucun abonnement Stripe associé à ce compte." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
      locale: locale as "fr" | "en",
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Billing portal session error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erreur portail" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

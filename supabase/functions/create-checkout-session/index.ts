// Crée une session Stripe Checkout pour un forfait (abonnement).
// Env: STRIPE_SECRET_KEY, STRIPE_PLAN_TO_PRICE_JSON (plan_id UUID → Stripe price_id)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getPlanToPriceMap(): Record<string, string> {
  const raw = Deno.env.get("STRIPE_PLAN_TO_PRICE_JSON");
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
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
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!stripeSecret || !supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error (Stripe/Supabase)" }),
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

  let body: { plan_id?: string; billing_cycle?: string; locale?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const planId = body.plan_id;
  const billingCycle = (body.billing_cycle || "monthly") as string;

  if (!planId) {
    return new Response(JSON.stringify({ error: "plan_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const planToPrice = getPlanToPriceMap();
  const priceId = planToPrice[planId];
  if (!priceId) {
    console.error("create-checkout-session: no Stripe price for plan_id", planId);
    return new Response(
      JSON.stringify({
        error: "Checkout not configured for this plan. Set STRIPE_PLAN_TO_PRICE_JSON (plan UUID → Stripe price_id).",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const stripe = new Stripe(stripeSecret);
  const siteUrl = (Deno.env.get("SITE_URL") || "https://www.monprojetmaison.ca").replace(/\/$/, "");
  const baseUrl = siteUrl.replace(/^https?:\/\/monprojetmaison\.ca$/, "https://www.monprojetmaison.ca");

  const locale = (body.locale === "en" || body.locale === "fr") ? body.locale : "fr";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      locale,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${baseUrl}/#/mes-projets?checkout=success`,
      cancel_url: `${baseUrl}/#/forfaits?checkout=cancelled`,
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      subscription_data: {
        metadata: { plan_id: planId, user_id: user.id },
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Stripe checkout session error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Checkout failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

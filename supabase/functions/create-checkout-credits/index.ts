// Checkout Stripe pour acheter des analyses IA supplémentaires (10 pour 10$, 20 pour 15$)
// Env: STRIPE_SECRET_KEY, STRIPE_CREDITS_PRICE_JSON (ex: {"10": "price_xxx", "20": "price_yyy"})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getCreditsPriceMap(): Record<string, string> {
  const raw = Deno.env.get("STRIPE_CREDITS_PRICE_JSON");
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
      JSON.stringify({ error: "Configuration serveur manquante (Stripe/Supabase)" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
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
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { credits_amount?: number; locale?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON invalide" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const creditsAmount = body.credits_amount;
  if (!creditsAmount || (creditsAmount !== 10 && creditsAmount !== 20)) {
    return new Response(
      JSON.stringify({ error: "credits_amount doit être 10 ou 20" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const creditsToPrice = getCreditsPriceMap();
  const priceId = creditsToPrice[String(creditsAmount)];
  if (!priceId) {
    return new Response(
      JSON.stringify({
        error: "Prix non configuré pour ce pack. Configurez STRIPE_CREDITS_PRICE_JSON.",
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
      mode: "payment",
      payment_method_types: ["card"],
      locale,
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: `${baseUrl}/#/achat-reussi`,
      cancel_url: `${baseUrl}/#/forfaits`,
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      metadata: {
        type: "ai_credits",
        credits_amount: String(creditsAmount),
        user_id: user.id,
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Stripe checkout credits error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erreur checkout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type CheckoutBody = {
  plan_id: string;
  billing_cycle: "monthly" | "yearly";
  success_url?: string;
  cancel_url?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Méthode non autorisée" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Authentification requise" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecretKey) {
    console.error("STRIPE_SECRET_KEY manquant");
    return new Response(
      JSON.stringify({ error: "Configuration Stripe manquante" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: CheckoutBody;
  try {
    body = (await req.json()) as CheckoutBody;
  } catch {
    return new Response(
      JSON.stringify({ error: "Corps JSON invalide" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { plan_id, billing_cycle, success_url, cancel_url } = body;
  if (!plan_id || !billing_cycle || !["monthly", "yearly"].includes(billing_cycle)) {
    return new Response(
      JSON.stringify({ error: "plan_id et billing_cycle (monthly|yearly) requis" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return new Response(
      JSON.stringify({ error: "Token manquant" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);
  if (userError || !user) {
    console.error("getUser error:", userError?.message ?? "no user");
    return new Response(
      JSON.stringify({ error: "Session invalide ou token expiré. Reconnectez-vous." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, name, price_monthly, price_yearly")
    .eq("id", plan_id)
    .eq("is_active", true)
    .single();

  if (planError || !plan) {
    return new Response(
      JSON.stringify({ error: "Forfait introuvable ou inactif" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const amountCad =
    billing_cycle === "yearly" && plan.price_yearly != null
      ? plan.price_yearly
      : plan.price_monthly;
  const amountCents = Math.round(amountCad * 100);

  if (amountCents <= 0) {
    return new Response(
      JSON.stringify({ error: "Ce forfait est gratuit, pas de paiement Stripe" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-06-20",
  });

  const base = "https://monprojetmaison.ca";
  const defaultSuccess = `${base}/#/forfaits?success=1`;
  const defaultCancel = `${base}/#/forfaits?cancel=1`;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: plan.name,
              description:
                billing_cycle === "yearly"
                  ? "Abonnement annuel"
                  : "Abonnement mensuel",
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: success_url || defaultSuccess,
      cancel_url: cancel_url || defaultCancel,
      metadata: {
        plan_id: plan.id,
        user_id: user.id,
        billing_cycle,
      },
      client_reference_id: user.id,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Stripe checkout error:", err);
    const message = err instanceof Error ? err.message : "Erreur Stripe";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

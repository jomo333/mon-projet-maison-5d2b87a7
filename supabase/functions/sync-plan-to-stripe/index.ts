import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Authentification requise" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecretKey) {
    return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY manquant" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { plan_id: string };
  try {
    body = (await req.json()) as { plan_id: string };
  } catch {
    return new Response(JSON.stringify({ error: "Corps JSON invalide" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { plan_id } = body;
  if (!plan_id || typeof plan_id !== "string") {
    return new Response(JSON.stringify({ error: "plan_id requis" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) {
    return new Response(JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY manquant" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: userError,
  } = await supabaseAuth.auth.getUser(authHeader.replace(/^Bearer\s+/i, "").trim());
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Session invalide" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: isAdmin, error: adminError } = await supabaseAuth.rpc("is_admin", {
    _user_id: user.id,
  });
  if (adminError || !isAdmin) {
    return new Response(JSON.stringify({ error: "Réservé aux administrateurs" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: plan, error: planError } = await supabaseAdmin
    .from("plans")
    .select("id, name, description, price_monthly, price_yearly, stripe_product_id, stripe_price_lookup_monthly, stripe_price_lookup_yearly")
    .eq("id", plan_id)
    .single();

  if (planError || !plan) {
    return new Response(JSON.stringify({ error: "Forfait introuvable" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });
  const slug = slugFromName(plan.name) || "plan";
  const lookupMonthly = `${slug}_monthly`;
  const lookupYearly = `${slug}_yearly`;

  try {
    let productId = (plan as { stripe_product_id?: string }).stripe_product_id;
    if (!productId) {
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description ?? undefined,
      });
      productId = product.id;
    }

    const amountMonthlyCents = Math.round((plan.price_monthly ?? 0) * 100);
    const amountYearlyCents = Math.round((plan.price_yearly ?? plan.price_monthly * 12 ?? 0) * 100);

    if (amountMonthlyCents > 0) {
      const existingMonthly = await stripe.prices.list({
        lookup_keys: [lookupMonthly],
        active: true,
      });
      if (existingMonthly.data.length === 0) {
        await stripe.prices.create({
          product: productId,
          currency: "cad",
          unit_amount: amountMonthlyCents,
          recurring: { interval: "month" },
          lookup_key: lookupMonthly,
        });
      }
    }

    if (amountYearlyCents > 0) {
      const existingYearly = await stripe.prices.list({
        lookup_keys: [lookupYearly],
        active: true,
      });
      if (existingYearly.data.length === 0) {
        await stripe.prices.create({
          product: productId,
          currency: "cad",
          unit_amount: amountYearlyCents,
          recurring: { interval: "year" },
          lookup_key: lookupYearly,
        });
      }
    }

    const updatePayload: Record<string, unknown> = {
      stripe_product_id: productId,
      stripe_price_lookup_monthly: amountMonthlyCents > 0 ? lookupMonthly : null,
      stripe_price_lookup_yearly: amountYearlyCents > 0 ? lookupYearly : null,
    };

    await supabaseAdmin
      .from("plans")
      .update(updatePayload)
      .eq("id", plan_id);

    return new Response(
      JSON.stringify({
        success: true,
        stripe_product_id: productId,
        stripe_price_lookup_monthly: amountMonthlyCents > 0 ? lookupMonthly : null,
        stripe_price_lookup_yearly: amountYearlyCents > 0 ? lookupYearly : null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Stripe sync error:", err);
    const message = err instanceof Error ? err.message : "Erreur Stripe";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

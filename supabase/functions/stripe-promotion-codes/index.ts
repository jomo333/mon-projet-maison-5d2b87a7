// Liste et création de codes promotionnels Stripe (admin uniquement).
// GET: liste des codes promo Stripe
// POST: crée un coupon + code promo dans Stripe
// Env: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function isAdmin(supabaseUrl: string, serviceRoleKey: string, userId: string): Promise<boolean> {
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  return !!data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeSecret || !supabaseUrl || !serviceRoleKey) {
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

  const supabaseAnon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = await isAdmin(supabaseUrl, serviceRoleKey, user.id);
  if (!admin) {
    return new Response(JSON.stringify({ error: "Réservé aux administrateurs" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeSecret);

  // GET: lister les codes promo
  if (req.method === "GET") {
    try {
      const list = await stripe.promotionCodes.list({
        active: true,
        limit: 100,
        expand: ["data.coupon"],
      });
      const codes = (list.data || []).map((pc) => {
        const coupon = pc.coupon as Stripe.Coupon;
        return {
          id: pc.id,
          code: pc.code,
          active: pc.active,
          times_redeemed: pc.times_redeemed ?? 0,
          max_redemptions: pc.max_redemptions ?? null,
          expires_at: pc.expires_at ?? null,
          coupon: coupon ? {
            percent_off: coupon.percent_off ?? null,
            amount_off: coupon.amount_off ?? null,
            currency: coupon.currency ?? null,
            duration: coupon.duration,
            duration_in_months: coupon.duration_in_months ?? null,
            name: coupon.name ?? null,
          } : null,
        };
      });
      return new Response(JSON.stringify({ codes }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Stripe list promotion codes error:", err);
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : "Erreur liste des codes" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // POST: créer un coupon + code promo
  let body: {
    code?: string;
    discount_type?: "percent" | "amount";
    discount_value?: number;
    currency?: string;
    duration?: "once" | "repeating" | "forever";
    duration_in_months?: number;
    max_redemptions?: number;
    expires_at?: number;
    name?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Corps JSON invalide" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const codeStr = (body.code || "").trim().toUpperCase().replace(/\s/g, "");
  if (!codeStr || codeStr.length < 3) {
    return new Response(JSON.stringify({ error: "Le code doit faire au moins 3 caractères" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const discountType = body.discount_type === "amount" ? "amount" : "percent";
  const discountValue = Number(body.discount_value);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return new Response(JSON.stringify({ error: "Valeur de réduction invalide" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (discountType === "percent" && (discountValue < 1 || discountValue > 100)) {
    return new Response(JSON.stringify({ error: "Pourcentage entre 1 et 100" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const duration = (body.duration === "repeating" || body.duration === "forever") ? body.duration : "once";
  const durationInMonths = duration === "repeating" ? Math.max(1, Math.min(12, Math.round(Number(body.duration_in_months) || 1))) : undefined;
  const currency = (discountType === "amount" && body.currency) ? body.currency.toLowerCase() : "cad";
  const maxRedemptions = body.max_redemptions != null ? Math.max(1, Math.round(Number(body.max_redemptions))) : undefined;
  const expiresAt = body.expires_at != null ? Math.round(Number(body.expires_at)) : undefined;
  const name = (body.name || codeStr).trim() || undefined;

  try {
    const couponParams: Stripe.CouponCreateParams = {
      [discountType === "percent" ? "percent_off" : "amount_off"]: discountType === "percent"
        ? Math.round(discountValue)
        : Math.round(discountValue * 100),
      ...(discountType === "amount" && { currency }),
      duration,
      ...(duration === "repeating" && durationInMonths && { duration_in_months: durationInMonths }),
      ...(maxRedemptions != null && { max_redemptions: maxRedemptions }),
      ...(name && { name }),
    };

    const coupon = await stripe.coupons.create(couponParams as Stripe.CouponCreateParams);

    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: codeStr,
      ...(maxRedemptions != null && { max_redemptions: maxRedemptions }),
      ...(expiresAt && expiresAt > Math.floor(Date.now() / 1000) && { expires_at: expiresAt }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        code: promotionCode.code,
        promotion_code_id: promotionCode.id,
        coupon_id: coupon.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Stripe create promotion code error:", err);
    const msg = err instanceof Error ? err.message : "Erreur création du code";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

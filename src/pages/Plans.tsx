import { useEffect, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { PricingSection } from "@/components/landing/PricingSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Home, ClipboardList, Shield, Heart, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PlanUsageCard } from "@/components/subscription/PlanUsageCard";
import { formatCurrency } from "@/lib/i18n";
import { getTranslatedPlanName, getTranslatedPlanDescription, getTranslatedPlanFeatures } from "@/lib/planTiersI18n";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  features: string[];
  limits: {
    projects?: number;
    ai_analyses_per_month?: number;
    storage_gb?: number;
    documents?: number;
  };
  is_featured: boolean;
  display_order: number;
}

export default function Plans() {
  const { t, i18n } = useTranslation();
  const stripeLocale = i18n.language?.startsWith("en") ? "en" : "fr";
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const benefits = [
    {
      icon: ClipboardList,
      title: t("plans.benefit1Title"),
      description: t("plans.benefit1Desc"),
    },
    {
      icon: Sparkles,
      title: t("plans.benefit2Title"),
      description: t("plans.benefit2Desc"),
    },
    {
      icon: Home,
      title: t("plans.benefit3Title"),
      description: t("plans.benefit3Desc"),
    },
    {
      icon: Shield,
      title: t("plans.benefit4Title"),
      description: t("plans.benefit4Desc"),
    },
    {
      icon: Heart,
      title: t("plans.benefit5Title"),
      description: t("plans.benefit5Desc"),
    },
  ];

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (!error && data) {
        setPlans(
          data.map((plan) => ({
            ...plan,
            price_monthly: Number(plan.price_monthly) || 0,
            price_yearly: plan.price_yearly != null ? Number(plan.price_yearly) : null,
            features: Array.isArray(plan.features) ? plan.features as string[] : [],
            limits: (plan.limits as Plan["limits"]) || {},
          }))
        );
      }
      setLoading(false);
    };

    fetchPlans();
  }, []);

  useEffect(() => {
    const credits = searchParams.get("credits");
    if (credits === "success") {
      toast.success(t("planUsage.creditsPurchaseSuccess", "Achat réussi ! Vos analyses supplémentaires ont été ajoutées."));
      setSearchParams({}, { replace: true });
    } else if (credits === "cancelled") {
      toast.info(t("planUsage.creditsPurchaseCancelled", "Achat annulé."));
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, t]);

  useEffect(() => {
    if (!user) return;
    const hash = location.hash;
    if (hash === "#acheter-analyses") {
      setTimeout(() => {
        document.getElementById("acheter-analyses")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } else if (hash === "#plans") {
      setTimeout(() => {
        document.getElementById("plans")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [location.hash, user]);

  const handleChoosePlan = async (plan: Plan) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const price = Number(plan.price_monthly) || 0;
    const isPaidByName = /essentiel|essential|gestion\s*complète/i.test(plan.name?.trim() || "");
    // Forfait payant (par nom ou prix) : Stripe Checkout uniquement
    if (price > 0 || isPaidByName) {
      setCheckoutLoading(plan.id);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: { session: refreshed } } = await supabase.auth.refreshSession();
        const token = refreshed?.access_token ?? session?.access_token;
        if (!token) {
          toast.error(t("common.error"));
          navigate("/auth");
          return;
        }
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        const res = await fetch(`${baseUrl}/functions/v1/create-checkout-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ plan_id: plan.id, billing_cycle: "monthly", locale: stripeLocale }),
        });
        const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok) {
          toast.error(body?.error || `Erreur ${res.status}`);
          console.error("create-checkout-session:", res.status, body);
          return;
        }
        if (body?.url) {
          window.location.href = body.url;
        } else {
          toast.error(body?.error || t("plans.checkoutError") || "Impossible de créer la session de paiement.");
        }
      } catch (err) {
        console.error("Checkout error:", err);
        toast.error(t("plans.checkoutError") || "Impossible de créer la session de paiement. Vérifiez la configuration Stripe.");
      } finally {
        setCheckoutLoading(null);
      }
      return;
    }
    // Forfait gratuit uniquement : mes projets
    navigate("/mes-projets");
  };

  const formatPrice = (price: number) => formatCurrency(price);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 lg:py-20 bg-gradient-to-b from-muted/50 to-background">
          <div className="container max-w-4xl">
            <div className="text-center">
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
                {t("plans.heroTitle")}
              </h1>
            </div>
          </div>
        </section>

        {/* Problem Statement Section */}
        <section className="py-12 lg:py-16">
          <div className="container max-w-3xl">
            <div className="prose prose-lg dark:prose-invert mx-auto text-center">
              <p className="text-muted-foreground leading-relaxed">
                {t("plans.problemIntro")} <strong className="text-foreground">{t("plans.problemHighlight")}</strong>.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                {t("plans.problemConclusion")} <strong className="text-foreground">{t("plans.problemConclusionHighlight")}</strong> {t("plans.problemConclusionEnd")}
              </p>
            </div>
          </div>
        </section>

        <Separator className="max-w-4xl mx-auto" />

        {/* Approach Section */}
        <section className="py-12 lg:py-16">
          <div className="container">
            <h2 className="text-2xl font-semibold text-center mb-4 text-foreground">
              {t("plans.approachTitle")}
            </h2>
            <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
              {t("plans.approachSubtitle")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center text-center p-4"
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-medium text-foreground mb-2 text-sm">
                      {benefit.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-center text-muted-foreground mt-10 max-w-2xl mx-auto text-sm">
              {t("plans.approachNote")} <strong className="text-foreground">{t("plans.approachNoteHighlight")}</strong> {t("plans.approachNoteEnd")}
            </p>
          </div>
        </section>

        <Separator className="max-w-4xl mx-auto" />

        {/* Evolving Plans Section */}
        <section className="py-12 lg:py-16 bg-muted/30">
          <div className="container max-w-3xl text-center">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">
              {t("plans.evolvingTitle")}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("plans.evolvingDesc")}
            </p>
          </div>
        </section>

        <Separator className="max-w-4xl mx-auto" />

        {/* Plans Section */}
        <section id="plans" className="py-16 lg:py-20 scroll-mt-24">
          <div className="container">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
                {plans.map((plan) => (
                  <Card
                    key={plan.id}
                    className={`relative flex flex-col transition-all duration-300 ${
                      plan.is_featured
                        ? "border-primary shadow-lg scale-[1.02] ring-2 ring-primary/20"
                        : "hover:shadow-md"
                    }`}
                  >
                    {plan.is_featured && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white border-amber-500 hover:bg-amber-600">
                        {t("pricing.mostPopular")}
                      </Badge>
                    )}

                    <CardHeader className="text-center pb-4">
                      <CardTitle className="text-xl font-semibold">
                        {getTranslatedPlanName(t, plan.name)}
                      </CardTitle>
                      <CardDescription className="text-sm mt-2">
                        {getTranslatedPlanDescription(t, plan.name, plan.description)}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1 space-y-6">
                      {/* Pricing */}
                      <div className="text-center">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold text-foreground">
                            {formatPrice(plan.price_monthly)}
                          </span>
                          <span className="text-muted-foreground">{t("common.perMonth")}</span>
                        </div>
                        {plan.price_yearly && plan.price_yearly > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {t("common.or")} {formatPrice(plan.price_yearly)}{t("common.perYear")}
                            {plan.price_monthly > 0 && (
                              <span className="text-primary ml-1">
                                {t("common.freeMonths")}
                              </span>
                            )}
                          </p>
                        )}
                      </div>

                      <Separator />

                      {/* Features */}
                      <ul className="space-y-3">
                        {getTranslatedPlanFeatures(t, plan.name, plan.features).map((feature, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <span className="text-sm text-foreground">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter className="pt-4">
                      <Button
                        onClick={() => handleChoosePlan(plan)}
                        disabled={!!checkoutLoading}
                        variant={plan.is_featured ? "accent" : "outline"}
                        className="w-full"
                        size="lg"
                      >
                        {checkoutLoading === plan.id ? (
                          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        ) : (
                          <>
                            {plan.price_monthly === 0 ? t("pricing.discovery.cta") : t("plans.choosePlan")}
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}

            {/* Reassuring text */}
            <div className="mt-12 text-center max-w-2xl mx-auto space-y-4">
              <p className="text-muted-foreground">
                <strong className="text-foreground">{t("plans.noWrongPlan")}</strong>
                <br />
                {t("plans.noWrongPlanDesc")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("plans.paymentDelayNote")}
              </p>
            </div>
          </div>
        </section>

        {/* Carte utilisation + achat analyses (utilisateur connecté) */}
        {user && (
          <section id="acheter-analyses" className="py-12 lg:py-16 border-t scroll-mt-24">
            <div className="container max-w-md mx-auto">
              <PlanUsageCard />
            </div>
          </section>
        )}

        {/* Legal disclaimer */}
        <section className="py-12 bg-muted/30">
          <div className="container max-w-3xl">
            <div className="bg-background border rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Monprojetmaison.ca</strong> {t("plans.disclaimer")}
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

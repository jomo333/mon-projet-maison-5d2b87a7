import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Home, ClipboardList, Shield, Heart, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

const principles = [
  {
    icon: Home,
    title: "Conçu pour les autoconstructeurs résidentiels",
    description: "Une plateforme pensée exclusivement pour ceux qui bâtissent leur propre maison.",
  },
  {
    icon: ClipboardList,
    title: "Un projet à la fois, bien structuré",
    description: "Accompagnement étape par étape pour une gestion claire et organisée.",
  },
  {
    icon: Sparkles,
    title: "Outils d'aide à la décision",
    description: "Des analyses et suggestions pour vous guider, sans décisions imposées.",
  },
  {
    icon: Shield,
    title: "Transparence totale",
    description: "Limites et fonctionnalités clairement indiquées pour chaque forfait.",
  },
  {
    icon: Heart,
    title: "Vous restez maître de votre projet",
    description: "L'utilisateur reste responsable de ses choix et de ses professionnels.",
  },
];

export default function Plans() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

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
            features: Array.isArray(plan.features) ? plan.features as string[] : [],
            limits: (plan.limits as Plan["limits"]) || {},
          }))
        );
      }
      setLoading(false);
    };

    fetchPlans();
  }, []);

  const handleChoosePlan = (planId: string) => {
    if (user) {
      navigate("/mes-projets");
    } else {
      navigate("/auth");
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 lg:py-20 bg-gradient-to-b from-muted/50 to-background">
          <div className="container max-w-4xl text-center">
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
              Des forfaits adaptés à votre projet
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              Les forfaits de Monprojetmaison.ca sont conçus pour s'adapter au niveau d'implication 
              et aux besoins de chaque autoconstructeur. Chaque forfait offre un accès progressif 
              aux outils de planification, de gestion et d'analyse, afin de vous accompagner dans 
              la prise de décisions tout au long de votre projet.
            </p>
          </div>
        </section>

        {/* Principles Section */}
        <section className="py-12 lg:py-16">
          <div className="container">
            <h2 className="text-2xl font-semibold text-center mb-10 text-foreground">
              Notre philosophie
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {principles.map((principle, index) => {
                const Icon = principle.icon;
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center text-center p-4"
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-medium text-foreground mb-2 text-sm">
                      {principle.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {principle.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <Separator className="max-w-4xl mx-auto" />

        {/* Plans Section */}
        <section className="py-16 lg:py-20">
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
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                        Le plus populaire
                      </Badge>
                    )}

                    <CardHeader className="text-center pb-4">
                      <CardTitle className="text-xl font-semibold">
                        {plan.name}
                      </CardTitle>
                      <CardDescription className="text-sm mt-2">
                        {plan.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1 space-y-6">
                      {/* Pricing */}
                      <div className="text-center">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold text-foreground">
                            {formatPrice(plan.price_monthly)}
                          </span>
                          <span className="text-muted-foreground">/mois</span>
                        </div>
                        {plan.price_yearly && plan.price_yearly > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            ou {formatPrice(plan.price_yearly)}/an
                            {plan.price_monthly > 0 && (
                              <span className="text-primary ml-1">
                                (2 mois gratuits)
                              </span>
                            )}
                          </p>
                        )}
                      </div>

                      <Separator />

                      {/* Features */}
                      <ul className="space-y-3">
                        {plan.features.map((feature, index) => (
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
                        onClick={() => handleChoosePlan(plan.id)}
                        variant={plan.is_featured ? "accent" : "outline"}
                        className="w-full"
                        size="lg"
                      >
                        {plan.price_monthly === 0 ? "Commencer gratuitement" : "Choisir ce forfait"}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}

            {/* Reassuring text */}
            <div className="mt-12 text-center max-w-2xl mx-auto">
              <p className="text-muted-foreground">
                <strong className="text-foreground">Il n'y a pas de « mauvais » forfait.</strong>
                <br />
                Vous pouvez commencer gratuitement, explorer la plateforme et passer à un 
                forfait supérieur lorsque vos besoins évoluent.
              </p>
            </div>
          </div>
        </section>

        {/* Legal disclaimer */}
        <section className="py-12 bg-muted/30">
          <div className="container max-w-3xl">
            <div className="bg-background border rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Important :</strong> Les analyses fournies par l'IA 
                sont basées sur des données moyennes du marché et servent à la planification. 
                Elles ne remplacent pas les soumissions de professionnels ni les obligations 
                réglementaires en vigueur.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

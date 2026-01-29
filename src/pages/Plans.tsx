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

const benefits = [
  {
    icon: ClipboardList,
    title: "Structurer votre projet",
    description: "Étape par étape, avec une vue claire de ce qui reste à faire.",
  },
  {
    icon: Sparkles,
    title: "Visualiser budget et échéancier",
    description: "Gardez le contrôle sur les coûts et le calendrier de votre projet.",
  },
  {
    icon: Home,
    title: "Centraliser l'information",
    description: "Documents, soumissions et notes au même endroit.",
  },
  {
    icon: Shield,
    title: "Identifier les risques",
    description: "Repérez les éléments souvent oubliés avant qu'ils ne deviennent des problèmes.",
  },
  {
    icon: Heart,
    title: "Décider au bon moment",
    description: "Prenez des décisions plus réfléchies, sans pression.",
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
              Des forfaits pensés pour mieux gérer votre projet, dès le départ
            </h1>
          </div>
        </section>

        {/* Problem Statement Section */}
        <section className="py-12 lg:py-16">
          <div className="container max-w-3xl">
            <div className="prose prose-lg dark:prose-invert mx-auto text-center">
              <p className="text-muted-foreground leading-relaxed">
                Construire sa maison en autoconstruction est un projet important, autant sur le plan financier que personnel.
                Même avec de la motivation et de la bonne volonté, une mauvaise planification ou une gestion imprécise peut rapidement entraîner des conséquences coûteuses : <strong className="text-foreground">retards, décisions prises dans l'urgence, dépassements de budget ou travaux à reprendre</strong>.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Dans bien des cas, ces problèmes ne viennent pas d'un manque de compétence, mais d'un <strong className="text-foreground">manque de structure, de visibilité et d'outils adaptés</strong> à la réalité de l'autoconstruction.
              </p>
            </div>
          </div>
        </section>

        <Separator className="max-w-4xl mx-auto" />

        {/* Approach Section */}
        <section className="py-12 lg:py-16">
          <div className="container">
            <h2 className="text-2xl font-semibold text-center mb-4 text-foreground">
              Une approche basée sur la clarté et la prévention
            </h2>
            <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
              Les forfaits de Monprojetmaison.ca sont conçus pour aider les autoconstructeurs à :
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
              L'objectif n'est pas de remplacer les professionnels, mais de <strong className="text-foreground">réduire les erreurs évitables</strong> et d'améliorer la coordination tout au long du projet.
            </p>
          </div>
        </section>

        <Separator className="max-w-4xl mx-auto" />

        {/* Evolving Plans Section */}
        <section className="py-12 lg:py-16 bg-muted/30">
          <div className="container max-w-3xl text-center">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">
              Des forfaits évolutifs, selon vos besoins réels
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Chaque forfait offre un accès progressif aux outils de planification, de gestion et d'analyse.
              Vous pouvez commencer simplement, puis évoluer vers des fonctionnalités plus avancées lorsque votre projet gagne en complexité.
            </p>
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
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white border-amber-500 hover:bg-amber-600">
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
                <strong className="text-foreground">Monprojetmaison.ca</strong> est conçu exclusivement pour les autoconstructeurs résidentiels.
                Les outils et analyses servent à structurer le projet et à soutenir la prise de décision, 
                sans remplacer les professionnels ni les soumissions réelles.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

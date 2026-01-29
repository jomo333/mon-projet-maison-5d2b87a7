import { Check, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    name: "Découverte",
    price: "0 $",
    period: "/mois",
    description: "Pour explorer les fonctionnalités de base gratuitement.",
    features: [
      "1 projet actif",
      "Guide et structure en lecture seule",
      "Stockage 10 Go",
      "1 analyse IA par mois",
    ],
    cta: "Commencer gratuitement",
    featured: false,
  },
  {
    name: "Essentiel",
    price: "50 $",
    period: "/mois",
    yearlyPrice: "500 $/an",
    description: "L'outil complet pour gérer votre autoconstruction.",
    features: [
      "1 projet actif",
      "Échéancier et budget modifiables",
      "Guide complet avec suivi",
      "Stockage 10 Go",
      "10 analyses IA par mois",
    ],
    cta: "Choisir Essentiel",
    featured: false,
  },
  {
    name: "Gestion complète",
    price: "125 $",
    period: "/mois",
    yearlyPrice: "1 230 $/an",
    description: "Pour une gestion avancée avec analyses spécialisées.",
    features: [
      "1 projet actif",
      "Tout du forfait Essentiel",
      "Analyses par corps de métier",
      "Détection d'incohérences",
      "Stockage 10 Go",
      "20 analyses IA par mois",
    ],
    cta: "Choisir Gestion complète",
    featured: true,
  },
];

export function PricingSection() {
  const navigate = useNavigate();

  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12 lg:mb-16">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl animate-fade-up">
            Un forfait adapté à vos besoins
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto animate-fade-up-delay-1">
            Commencez gratuitement, passez à Pro quand vous êtes prêt
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={plan.name}
              className={`relative overflow-hidden transition-all duration-300 animate-fade-up ${
                plan.featured 
                  ? "border-amber-500/50 shadow-xl shadow-amber-500/10 scale-[1.02] md:scale-105" 
                  : "border-border/50 hover:border-border shadow-card hover:shadow-lg"
              }`}
              style={{ animationDelay: `${0.1 + index * 0.1}s` }}
            >
              {plan.featured && (
                <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  Le plus populaire
                </div>
              )}
              
              <CardHeader className="pb-4">
                <CardTitle className="font-display text-xl">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className={`text-3xl font-bold ${plan.featured ? "text-amber-600" : "text-foreground"}`}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  )}
                </div>
                {plan.yearlyPrice && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ou {plan.yearlyPrice} <span className="text-amber-600">(2 mois gratuits)</span>
                  </p>
                )}
                <CardDescription className="mt-2">{plan.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="pb-4">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className={`h-4 w-4 shrink-0 mt-0.5 ${plan.featured ? "text-amber-500" : "text-emerald-500"}`} />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter>
                <Button 
                  variant={plan.featured ? "accent" : "outline"}
                  className="w-full"
                  onClick={() => navigate(plan.name === "Entreprise" ? "/contact" : "/forfaits")}
                >
                  {plan.cta}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

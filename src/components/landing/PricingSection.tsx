import { Check, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/i18n";

export function PricingSection() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const plans = [
    {
      nameKey: "pricing.discovery.name",
      price: 0,
      descKey: "pricing.discovery.description",
      featuresKey: "pricing.discovery.features",
      ctaKey: "pricing.discovery.cta",
      yearlyPrice: null,
      featured: false,
    },
    {
      nameKey: "pricing.essential.name",
      price: 50,
      descKey: "pricing.essential.description",
      featuresKey: "pricing.essential.features",
      ctaKey: "pricing.essential.cta",
      yearlyPrice: 500,
      featured: false,
    },
    {
      nameKey: "pricing.complete.name",
      price: 125,
      descKey: "pricing.complete.description",
      featuresKey: "pricing.complete.features",
      ctaKey: "pricing.complete.cta",
      yearlyPrice: 1230,
      featured: true,
    },
  ];

  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12 lg:mb-16">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl animate-fade-up">
            {t("pricing.title")}
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto animate-fade-up-delay-1">
            {t("pricing.subtitle")}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((plan, index) => {
            const features = t(plan.featuresKey, { returnObjects: true }) as string[];
            return (
              <Card 
                key={plan.nameKey}
                className={`relative overflow-hidden transition-all duration-300 animate-fade-up flex flex-col ${
                  plan.featured 
                    ? "border-amber-500/50 shadow-xl shadow-amber-500/10 scale-[1.02] md:scale-105" 
                    : "border-border/50 hover:border-border shadow-card hover:shadow-lg"
                }`}
                style={{ animationDelay: `${0.1 + index * 0.1}s` }}
              >
                {plan.featured && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    {t("pricing.mostPopular")}
                  </div>
                )}
                
                <CardHeader className="pb-4">
                  <CardTitle className="font-display text-xl">{t(plan.nameKey)}</CardTitle>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className={`text-3xl font-bold ${plan.featured ? "text-amber-600" : "text-foreground"}`}>
                      {formatCurrency(plan.price)}
                    </span>
                    <span className="text-muted-foreground text-sm">{t("common.perMonth")}</span>
                  </div>
                  {plan.yearlyPrice && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("common.or", "ou")} {formatCurrency(plan.yearlyPrice)}{t("common.perYear")} <span className="text-amber-600">{t("common.freeMonths")}</span>
                    </p>
                  )}
                  <CardDescription className="mt-2">{t(plan.descKey)}</CardDescription>
                </CardHeader>
                
                <CardContent className="pb-4 flex-1">
                  <ul className="space-y-3">
                    {Array.isArray(features) && features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
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
                    onClick={() => navigate("/forfaits")}
                  >
                    {t(plan.ctaKey)}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

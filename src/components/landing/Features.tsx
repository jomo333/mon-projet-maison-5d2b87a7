import { Brain, Calculator, ListChecks, FileCheck, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Brain,
    title: "Assistant IA intelligent",
    description: "Analyse votre projet étape par étape, identifie les risques et propose un ordre logique des travaux selon les meilleures pratiques québécoises.",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: Calculator,
    title: "Estimation budgétaire",
    description: "Estimez vos coûts par étape, comparez budget prévu et réel, recevez des alertes en cas de dépassement.",
    color: "bg-success/10 text-success",
  },
  {
    icon: ListChecks,
    title: "Gestion de projet",
    description: "Liste claire des étapes, suivi de l'avancement en pourcentage, coordination simplifiée des corps de métier.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: FileCheck,
    title: "Conformité réglementaire",
    description: "Références au Code du bâtiment du Québec, rappels des obligations RBQ, inspections et assurances.",
    color: "bg-warning/10 text-warning",
  },
];

export function Features() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Tout ce dont vous avez besoin
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Des outils puissants et simples pour accompagner votre projet du début à la fin
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={feature.title} 
                className="group relative overflow-hidden border-border/50 hover:border-accent/50 transition-all duration-300 hover:shadow-lg animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="font-display text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="h-4 w-4 text-accent" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

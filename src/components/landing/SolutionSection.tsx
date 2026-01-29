import { Calculator, CalendarClock, FileText, ClipboardList, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const solutions = [
  {
    icon: Calculator,
    title: "Budget",
    description: "Suivez vos dépenses par catégorie, comparez prévisions et réel, recevez des alertes en cas de dépassement.",
    color: "bg-emerald-500/10 text-emerald-600",
    borderColor: "hover:border-emerald-500/30",
  },
  {
    icon: CalendarClock,
    title: "Échéancier",
    description: "Planifiez chaque étape avec un calendrier visuel, suivez l'avancement et anticipez les délais.",
    color: "bg-blue-500/10 text-blue-600",
    borderColor: "hover:border-blue-500/30",
  },
  {
    icon: FileText,
    title: "Soumissions",
    description: "Centralisez et comparez les devis de vos sous-traitants pour faire les meilleurs choix.",
    color: "bg-purple-500/10 text-purple-600",
    borderColor: "hover:border-purple-500/30",
  },
  {
    icon: ClipboardList,
    title: "Suivi & Journal",
    description: "Documentez chaque étape avec des notes et photos pour un historique complet de votre projet.",
    color: "bg-amber-500/10 text-amber-600",
    borderColor: "hover:border-amber-500/30",
  },
];

export function SolutionSection() {
  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm text-emerald-600 mb-6 animate-fade-up">
            ✓ La solution
          </div>
          
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl animate-fade-up-delay-1">
            Tout ce dont vous avez besoin, au même endroit
          </h2>
          
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto animate-fade-up-delay-2">
            Des outils simples et puissants pour garder le contrôle de votre projet à chaque étape
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {solutions.map((solution, index) => {
            const Icon = solution.icon;
            return (
              <Card 
                key={solution.title} 
                className={`group relative overflow-hidden border-border/50 ${solution.borderColor} transition-all duration-300 hover:shadow-lg shadow-card animate-fade-up`}
                style={{ animationDelay: `${0.2 + index * 0.1}s` }}
              >
                <CardHeader className="pb-3">
                  <div className={`w-12 h-12 rounded-xl ${solution.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="font-display text-lg">{solution.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {solution.description}
                  </CardDescription>
                </CardContent>
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

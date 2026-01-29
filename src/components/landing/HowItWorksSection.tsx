import { FolderPlus, Receipt, TrendingUp, ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: FolderPlus,
    title: "Créez votre projet",
    description: "En quelques clics, configurez votre projet avec les informations de base : type de construction, superficie, budget cible.",
  },
  {
    number: "02",
    icon: Receipt,
    title: "Ajoutez vos coûts et soumissions",
    description: "Importez vos devis, ajoutez vos dépenses par catégorie et gardez tout organisé au même endroit.",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Suivez et ajustez",
    description: "Visualisez votre avancement, recevez des alertes et prenez des décisions éclairées tout au long du projet.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container">
        <div className="text-center mb-12 lg:mb-16">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl animate-fade-up">
            Comment ça marche?
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto animate-fade-up-delay-1">
            Trois étapes simples pour reprendre le contrôle de votre projet
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* Connection line - desktop only */}
          <div className="hidden lg:block absolute top-24 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-amber-500/20 via-amber-500/40 to-amber-500/20" />
          
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div 
                  key={step.number}
                  className="relative group text-center animate-fade-up"
                  style={{ animationDelay: `${0.1 + index * 0.15}s` }}
                >
                  {/* Step number and icon */}
                  <div className="relative inline-flex flex-col items-center">
                    <span className="text-xs font-bold text-amber-500 mb-3 tracking-wider">
                      ÉTAPE {step.number}
                    </span>
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-navy text-white shadow-lg group-hover:scale-105 transition-transform duration-300">
                      <Icon className="h-8 w-8" />
                      {/* Pulse ring */}
                      <div className="absolute inset-0 rounded-2xl bg-amber-500/20 animate-ping opacity-0 group-hover:opacity-100" style={{ animationDuration: '2s' }} />
                    </div>
                  </div>

                  {/* Arrow - desktop only */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:flex absolute top-24 -right-4 z-10">
                      <ArrowRight className="h-5 w-5 text-amber-500/50" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="mt-6">
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

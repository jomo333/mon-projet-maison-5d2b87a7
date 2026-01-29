import { FolderPlus, Receipt, TrendingUp, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export function HowItWorksSection() {
  const { t } = useTranslation();

  const steps = [
    {
      number: "01",
      icon: FolderPlus,
      titleKey: "howItWorks.step1.title",
      descKey: "howItWorks.step1.description",
    },
    {
      number: "02",
      icon: Receipt,
      titleKey: "howItWorks.step2.title",
      descKey: "howItWorks.step2.description",
    },
    {
      number: "03",
      icon: TrendingUp,
      titleKey: "howItWorks.step3.title",
      descKey: "howItWorks.step3.description",
    },
  ];

  const stepLabel = t("common.step", "STEP");

  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container">
        <div className="text-center mb-12 lg:mb-16">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl animate-fade-up">
            {t("howItWorks.title")}
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto animate-fade-up-delay-1">
            {t("howItWorks.subtitle")}
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
                      {stepLabel} {step.number}
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
                      {t(step.titleKey)}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                      {t(step.descKey)}
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

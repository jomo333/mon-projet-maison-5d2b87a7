import { AlertTriangle, Clock, DollarSign, FileX } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ProblemSection() {
  const { t } = useTranslation();

  const problems = [
    {
      icon: DollarSign,
      titleKey: "problem.item2.title",
      descKey: "problem.item2.description",
    },
    {
      icon: Clock,
      titleKey: "problem.item1.title",
      descKey: "problem.item1.description",
    },
    {
      icon: FileX,
      titleKey: "problem.item3.title",
      descKey: "problem.item3.description",
    },
  ];

  return (
    <section className="py-16 lg:py-20 bg-background">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-2 text-sm text-destructive mb-6 animate-fade-up">
            <AlertTriangle className="h-4 w-4" />
            {t("problem.title")}
          </div>
          
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl text-foreground animate-fade-up-delay-1">
            {t("problem.subtitle")}
          </h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {problems.map((problem, index) => {
              const Icon = problem.icon;
              return (
                <div 
                  key={problem.titleKey}
                  className="group flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-6 transition-all hover:border-destructive/40 hover:bg-destructive/10 animate-fade-up"
                  style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                    <Icon className="h-6 w-6 text-destructive" />
                  </div>
                  <p className="text-sm font-semibold text-foreground text-center">{t(problem.titleKey)}</p>
                  <p className="text-xs text-muted-foreground text-center">{t(problem.descKey)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

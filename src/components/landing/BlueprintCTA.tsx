import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function BlueprintCTA() {
  const { t } = useTranslation();

  const benefits = [
    t("ctaBenefits.planning", "Planification étape par étape"),
    t("ctaBenefits.budget", "Suivi budgétaire en temps réel"),
    t("ctaBenefits.ai", "Assistant IA disponible 24/7"),
    t("ctaBenefits.compliant", "Conforme aux normes québécoises"),
  ];

  return (
    <section className="py-16 lg:py-24 bg-muted/30 overflow-x-hidden">
      <div className="container px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-navy blueprint-pattern p-6 sm:p-8 md:p-12 lg:p-16 min-w-0">
          {/* House outline in background */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.06] pointer-events-none">
            <svg
              viewBox="0 0 400 320"
              className="w-[300px] h-[240px] md:w-[400px] md:h-[320px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                d="M200 40 L360 140 L360 280 L40 280 L40 140 Z"
                className="text-slate-200"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M140 280 L140 200 L200 200 L200 280"
                className="text-slate-200"
              />
              <rect x="240" y="180" width="60" height="50" className="text-slate-200" rx="2" />
            </svg>
          </div>

          <div className="relative grid gap-8 lg:grid-cols-2 lg:gap-12 items-center min-w-0">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl break-words">
                {t("cta.title")}
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-300 break-words">
                {t("cta.subtitle")}
              </p>

              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2 text-slate-200 min-w-0">
                    <CheckCircle2 className="h-5 w-5 text-amber-500 shrink-0" />
                    <span className="text-sm break-words">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col items-center lg:items-end gap-4 min-w-0">
              <Link to="/start" className="w-full sm:w-auto">
                <Button
                  variant="accent"
                  size="xl"
                  className="w-full sm:w-auto text-sm sm:text-base whitespace-normal h-auto py-3 px-6 min-w-0"
                >
                  {t("cta.button")}
                  <ArrowRight className="h-5 w-5 shrink-0 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

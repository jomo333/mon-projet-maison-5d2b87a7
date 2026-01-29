import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const benefits = [
  "Planification étape par étape",
  "Suivi budgétaire en temps réel",
  "Assistant IA disponible 24/7",
  "Conforme aux normes québécoises",
];

export function BlueprintCTA() {
  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl bg-navy blueprint-pattern p-8 md:p-12 lg:p-16">
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

          <div className="relative grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Prêt à construire votre maison de rêve?
              </h2>
              <p className="mt-4 text-lg text-slate-300">
                Rejoignez des centaines d'autoconstructeurs qui utilisent MonProjetMaison pour réaliser leur projet en toute sérénité.
              </p>

              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2 text-slate-200">
                    <CheckCircle2 className="h-5 w-5 text-amber-500 shrink-0" />
                    <span className="text-sm">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col items-center lg:items-end gap-4">
              <Link to="/start">
                <Button variant="accent" size="xl" className="w-full sm:w-auto">
                  Commencer gratuitement
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <p className="text-sm text-slate-400">
                Aucune carte de crédit requise
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

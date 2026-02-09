import { ArrowRight, Shield, Clock, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logoSlim from "@/assets/logo-slim.png";
import blueprintBgFr from "@/assets/blueprint-background-fr.jpg";
import blueprintBgEn from "@/assets/blueprint-background-en.jpg";

export function BlueprintHero() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const blueprintBg = i18n.language?.startsWith("en") ? blueprintBgEn : blueprintBgFr;

  const features = [
    { icon: Shield, textKey: "hero.feature1" },
    { icon: Clock, textKey: "hero.feature2" },
    { icon: PiggyBank, textKey: "hero.feature3" },
  ];

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-navy">
      {/* Blueprint background image */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${blueprintBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.25,
        }}
      />

      <div className="container relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          {/* Logo slim */}
          <div className="mb-8 flex justify-center animate-fade-up">
            <img 
              src={logoSlim} 
              alt="MonProjetMaison.ca - Planifier. Construire. Réussir." 
              className="h-[144px] sm:h-48 w-auto drop-shadow-lg"
            />
          </div>

          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm text-slate-200 backdrop-blur-sm border border-white/10 animate-fade-up-delay-1">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            {t("hero.badge")}
          </div>

          {/* Main heading */}
          <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl xl:text-5xl animate-fade-up-delay-1">
            {t("hero.title")}
            <span className="block mt-2 text-slate-300">{t("hero.titleHighlight")}</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-8 text-lg text-slate-400 sm:text-xl max-w-2xl mx-auto leading-relaxed animate-fade-up-delay-2">
            {t("hero.subtitle")}
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up-delay-3">
            <Button 
              variant="accent" 
              size="xl" 
              onClick={() => navigate("/start")}
              className="w-full sm:w-auto text-base"
            >
              {t("hero.cta")}
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full sm:w-auto border-slate-600 bg-transparent text-slate-200 hover:bg-white/10 hover:text-white"
              onClick={() => navigate("/forfaits")}
            >
              {t("hero.ctaSecondary")}
            </Button>
          </div>

          {/* Features */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={feature.textKey} 
                  className="flex items-center gap-2.5 text-slate-400 animate-fade-up"
                  style={{ animationDelay: `${0.4 + index * 0.1}s` }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                    <Icon className="h-4 w-4 text-amber-500" />
                  </div>
                  <span className="text-sm font-medium">{t(feature.textKey)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}

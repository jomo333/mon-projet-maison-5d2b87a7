import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { BlueprintHero } from "@/components/landing/BlueprintHero";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { BlueprintCTA } from "@/components/landing/BlueprintCTA";
import { BlueprintFooter } from "@/components/landing/BlueprintFooter";

const Index = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("credits") === "ok") {
      toast.success(t("planUsage.creditsPurchaseSuccess", "Achat réussi ! Vos analyses supplémentaires ont été ajoutées."));
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, t]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <BlueprintHero />
        <ProblemSection />
        <SolutionSection />
        <HowItWorksSection />
        <PricingSection />
        <FAQSection />
        <BlueprintCTA />
      </main>
      <BlueprintFooter />
    </div>
  );
};

export default Index;

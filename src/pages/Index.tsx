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

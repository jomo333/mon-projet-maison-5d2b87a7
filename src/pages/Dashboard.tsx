import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { ProjectOverview } from "@/components/dashboard/ProjectOverview";
import { ConstructionStages } from "@/components/dashboard/ConstructionStages";
import { AIAssistant } from "@/components/dashboard/AIAssistant";
import { BudgetChart } from "@/components/dashboard/BudgetChart";

const Dashboard = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="container space-y-8">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Tableau de bord
            </h1>
            <p className="text-muted-foreground mt-1">
              Bienvenue! Voici l'état de votre projet de construction.
            </p>
          </div>

          <ProjectOverview />

          <div className="grid gap-6 lg:grid-cols-2">
            <ConstructionStages />
            <div className="space-y-6">
              <AIAssistant />
            </div>
          </div>

          <BudgetChart />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;

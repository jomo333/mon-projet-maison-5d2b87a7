import { ArrowRight, Shield, Clock, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logoSlim from "@/assets/logo-slim.png";

const features = [
  { icon: Shield, text: "Conforme au Code du bâtiment" },
  { icon: Clock, text: "Économisez du temps" },
  { icon: PiggyBank, text: "Réduisez les coûts" },
];

export function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-hero py-6 lg:py-10">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none -z-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="container relative">
        <div className="mx-auto max-w-5xl text-center">
          {/* Logo slim */}
          <div className="mb-6 flex justify-center">
            <img 
              src={logoSlim} 
              alt="MonProjetMaison.ca - Planifier. Construire. Réussir." 
              className="h-[120px] sm:h-40 w-auto drop-shadow-lg"
            />
          </div>

          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
            <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
            Pour les autoconstructeurs au Québec
          </div>

          <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Votre copilote pour
            <span className="block text-white/90 mt-2">construire en toute confiance</span>
          </h1>

          <p className="mt-6 text-lg text-white/80 sm:text-xl max-w-2xl mx-auto">
            Planifiez, budgétisez et gérez votre projet de construction résidentielle. 
            Évitez les dépassements de coûts et les erreurs de coordination.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              variant="hero" 
              size="xl" 
              onClick={() => navigate("/start")}
            >
              Démarrer mon projet
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-white/30 text-white hover:bg-white/10 hover:text-white"
              onClick={() => navigate("/guide")}
            >
              Voir le guide
            </Button>
          </div>

          <div className="mt-16 flex flex-wrap items-center justify-center gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.text} className="flex items-center gap-2 text-white/70">
                  <Icon className="h-5 w-5 text-accent" />
                  <span className="text-sm font-medium">{feature.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-accent/5 blur-3xl pointer-events-none -z-10" />
    </section>
  );
}

import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const PurchaseSuccess = () => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-green-100 p-4">
            <Check className="h-12 w-12 text-green-600" strokeWidth={3} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Achat réussi !</h1>
        <p className="text-muted-foreground mb-8">
          Vos analyses supplémentaires ont été ajoutées à votre compte.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/mes-projets">Mes projets</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/forfaits">Forfaits</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">Accueil</Link>
          </Button>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default PurchaseSuccess;

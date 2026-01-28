import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("Erreur 404: L'utilisateur a tenté d'accéder à une route inexistante:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-primary">404</h1>
        <p className="mb-2 text-2xl font-semibold">Page introuvable</p>
        <p className="mb-6 text-muted-foreground">
          Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <Button asChild>
          <Link to="/" className="gap-2">
            <Home className="h-4 w-4" />
            Retour à l'accueil
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;

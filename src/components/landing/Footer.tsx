import { Home, Mail, Phone, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useCookieConsent } from "@/components/cookies/CookieConsent";

const CookieSettingsButton = () => {
  const { openPreferences } = useCookieConsent();
  
  return (
    <button 
      onClick={openPreferences}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
    >
      <Settings className="h-3.5 w-3.5" />
      Gérer mes cookies
    </button>
  );
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-gradient">
                <Home className="h-5 w-5 text-accent-foreground" />
              </div>
              <span className="font-display text-xl font-bold">MonProjetMaison</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-sm">
              Votre assistant intelligent pour la construction résidentielle au Québec. Planifiez, budgétisez et construisez en toute confiance.
            </p>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">Navigation</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Tableau de bord
                </Link>
              </li>
              <li>
                <Link to="/budget" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Budget
                </Link>
              </li>
              <li>
                <Link to="/guide" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Guide
                </Link>
              </li>
              <li>
                <Link to="/confidentialite" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link to="/conditions" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Conditions d'utilisation
                </Link>
              </li>
              <li>
                <Link to="/politique-cookies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Politique de cookies
                </Link>
              </li>
              <li>
                <CookieSettingsButton />
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">Contact</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                info@monprojetmaison.ca
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                1-800-MAISON
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} MonProjetMaison. Tous droits réservés.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Les informations fournies n'ont pas de valeur légale. Consultez toujours un professionnel.
          </p>
        </div>
      </div>
    </footer>
  );
}

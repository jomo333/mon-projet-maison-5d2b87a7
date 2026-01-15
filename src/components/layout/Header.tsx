import { Home, LayoutDashboard, Calculator, BookOpen, MessageSquare } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/budget", label: "Budget", icon: Calculator },
  { href: "/guide", label: "Guide", icon: BookOpen },
];

export function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-gradient">
            <Home className="h-5 w-5 text-accent-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            MonProjetMaison
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative">
            <MessageSquare className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent animate-pulse" />
          </Button>
          <Button variant="accent" size="sm" className="hidden sm:flex">
            Commencer
          </Button>
        </div>
      </div>
    </header>
  );
}

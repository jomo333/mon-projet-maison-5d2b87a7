import { LayoutDashboard, Calculator, BookOpen, User, LogOut, FolderOpen, Scale, FolderDown, CalendarDays, ListChecks } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.png";

const navItems = [
  { href: "/mes-projets", label: "Mes Projets", icon: FolderOpen },
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/etapes", label: "Étapes", icon: ListChecks },
  { href: "/galerie", label: "Mes Dossiers", icon: FolderDown },
  { href: "/budget", label: "Budget", icon: Calculator },
  { href: "/echeancier", label: "Échéancier", icon: CalendarDays },
  { href: "/code-batiment", label: "Code du bâtiment", icon: Scale },
  { href: "/guide", label: "Guide", icon: BookOpen },
];

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, signOut, loading } = useAuth();
  
  // Get project ID from URL if available
  const projectId = searchParams.get("project") || location.pathname.match(/\/projet\/([^/]+)/)?.[1];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src={logo} alt="MonProjetMaison.ca" className="h-10 w-auto" />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || 
              (item.href === "/galerie" && location.pathname === "/galerie");
            
            // Add project parameter for relevant pages
            let href = item.href;
            if (
              projectId &&
              (item.href === "/galerie" ||
                item.href === "/dashboard" ||
                item.href === "/budget" ||
                item.href === "/etapes")
            ) {
              href = `${item.href}?project=${projectId}`;
            }
            
            return (
              <Link
                key={item.href}
                to={href}
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
          {!loading && (
            <>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name || "User"} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        {profile?.display_name && (
                          <p className="font-medium">{profile.display_name}</p>
                        )}
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/mes-projets")}>
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Mes projets
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Tableau de bord
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        navigate(projectId ? `/etapes?project=${projectId}` : "/etapes")
                      }
                    >
                      <ListChecks className="mr-2 h-4 w-4" />
                      Étapes
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Se déconnecter
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                    <User className="h-4 w-4 mr-2" />
                    Connexion
                  </Button>
                  <Button variant="accent" size="sm" className="hidden sm:flex" onClick={() => navigate("/auth")}>
                    Commencer
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}

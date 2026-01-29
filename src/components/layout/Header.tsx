import { useState } from "react";
import { LayoutDashboard, Calculator, BookOpen, User, LogOut, FolderOpen, Scale, FolderDown, CalendarDays, Shield, CreditCard, Bug, Menu, X } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { LanguageSelector } from "./LanguageSelector";
import { ReportBugDialog } from "@/components/bug/ReportBugDialog";
import logo from "@/assets/logo.png";

const getNavItems = (t: (key: string) => string) => [
  { href: "/mes-projets", label: t("nav.myProjects"), icon: FolderOpen },
  { href: "/dashboard", label: t("nav.steps"), icon: LayoutDashboard },
  { href: "/galerie", label: t("nav.myFiles"), icon: FolderDown },
  { href: "/budget", label: t("nav.budget"), icon: Calculator },
  { href: "/echeancier", label: t("nav.schedule"), icon: CalendarDays },
  { href: "/code-batiment", label: t("nav.buildingCode"), icon: Scale },
  { href: "/guide", label: t("nav.guide"), icon: BookOpen },
  { href: "/forfaits", label: t("nav.plans"), icon: CreditCard },
];

export function Header() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, signOut, loading } = useAuth();
  const { isAdmin } = useAdmin();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const navItems = getNavItems(t);
  
  // Get project ID from URL if available
  const projectId = searchParams.get("project") || location.pathname.match(/\/projet\/([^/]+)/)?.[1];
  
  // Helper to get href with project param
  const getHref = (href: string) => {
    if (projectId && (href === "/galerie" || href === "/dashboard" || href === "/budget")) {
      return `${href}?project=${projectId}`;
    }
    return href;
  };

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
        {/* Mobile menu button */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">{t("nav.menu")}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="border-b p-4">
              <SheetTitle className="flex items-center gap-2">
                <img src={logo} alt="MonProjetMaison.ca" className="h-8 w-auto" />
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col p-4 gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={getHref(item.href)}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent/10 text-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                    location.pathname.startsWith("/admin")
                      ? "bg-accent/10 text-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Shield className="h-5 w-5" />
                  {t("nav.admin")}
                </Link>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex items-center">
          <img src={logo} alt="MonProjetMaison.ca" className="h-10 w-auto" />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || 
              (item.href === "/galerie" && location.pathname === "/galerie");
            
            return (
              <Link
                key={item.href}
                to={getHref(item.href)}
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
          <LanguageSelector />
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
                      {t("nav.myProjects")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(projectId ? `/dashboard?project=${projectId}` : "/dashboard")}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      {t("nav.steps")}
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/admin")}>
                          <Shield className="mr-2 h-4 w-4" />
                          {t("nav.admin")}
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <ReportBugDialog 
                      trigger={
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Bug className="mr-2 h-4 w-4" />
                          {t("reportBug.title", "Signaler un bug")}
                        </DropdownMenuItem>
                      }
                    />
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      {t("nav.logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                    <User className="h-4 w-4 mr-2" />
                    {t("nav.login")}
                  </Button>
                  <Button variant="accent" size="sm" className="hidden sm:flex" onClick={() => navigate("/auth")}>
                    {t("nav.getStarted")}
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

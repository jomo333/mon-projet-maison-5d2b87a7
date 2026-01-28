import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Package,
  CreditCard,
  Tag,
  Settings,
  FileText,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import logo from "@/assets/logo-slim.png";

interface AdminLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/admin/subscribers", label: "Abonnés", icon: Users },
  { href: "/admin/plans", label: "Forfaits", icon: Package },
  { href: "/admin/payments", label: "Paiements", icon: CreditCard },
  { href: "/admin/promotions", label: "Promotions", icon: Tag },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
  { href: "/admin/logs", label: "Journal d'activité", icon: FileText },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-3 px-4 py-6 border-b border-border">
        <img src={logo} alt="MonProjetMaison" className="h-8 w-auto" />
        {sidebarOpen && (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">Admin</span>
            <span className="text-xs text-muted-foreground">MonProjetMaison</span>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {sidebarOpen && <span>Retour au site</span>}
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-card transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        <SidebarContent />
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-[-12px] h-6 w-6 rounded-full border border-border bg-card hidden md:flex"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")}
          />
        </Button>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="MonProjetMaison" className="h-8 w-auto" />
          <span className="font-semibold text-foreground">Admin</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "md:hidden fixed top-14 left-0 bottom-0 z-40 w-64 bg-card border-r border-border flex flex-col transition-transform duration-300",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:pt-0 pt-14">
        <ScrollArea className="h-screen">
          <div className="p-6 lg:p-8">{children}</div>
        </ScrollArea>
      </main>
    </div>
  );
}

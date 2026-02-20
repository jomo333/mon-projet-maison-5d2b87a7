import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: ReactNode;
}

// Routes accessibles sans authentification
const PUBLIC_ROUTES = [
  "/",
  "/auth",
  "/reset-password",
  "/achat-reussi",
  "/confidentialite",
  "/conditions",
  "/politique-cookies",
  "/forfaits",
  "/bootstrap-admin",
];

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    location.pathname === route || location.pathname.startsWith(route + "/")
  );

  // Show loading spinner only for protected routes (public routes s'affichent immédiatement)
  if (loading && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // User not logged in and trying to access protected route
  if (!user && !isPublicRoute) {
    // Redirect to auth page with return URL
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

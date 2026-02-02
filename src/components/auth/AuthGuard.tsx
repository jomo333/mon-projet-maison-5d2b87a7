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
  "/confidentialite",
  "/conditions",
  "/politique-cookies",
  "/forfaits",
  "/bootstrap-admin",
];

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    location.pathname === route || location.pathname.startsWith(route + "/")
  );

  // User not logged in and trying to access protected route
  if (!user && !isPublicRoute) {
    // Redirect to auth page with return URL
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

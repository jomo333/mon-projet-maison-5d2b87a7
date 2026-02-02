import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ScrollToTop } from "@/components/ScrollToTop";
import { CookieConsent, CookieConsentProvider } from "@/components/cookies/CookieConsent";
import { LegalConsentGuard } from "@/components/auth/LegalConsentGuard";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ChatAssistant } from "@/components/chat/ChatAssistant";
import { SessionTrackerProvider } from "@/components/providers/SessionTrackerProvider";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Budget from "./pages/Budget";
import BuildingCode from "./pages/BuildingCode";
import Guide from "./pages/Guide";
import StartProject from "./pages/StartProject";
import ConstructionGuide from "./pages/ConstructionGuide";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import MyProjects from "./pages/MyProjects";
import ProjectGallery from "./pages/ProjectGallery";
import Project from "./pages/Project";
import Schedule from "./pages/Schedule";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import CookiePolicy from "./pages/CookiePolicy";
import Plans from "./pages/Plans";
import Admin from "./pages/Admin";
import AdminSubscribers from "./pages/AdminSubscribers";
import AdminPlans from "./pages/AdminPlans";
import AdminPayments from "./pages/AdminPayments";
import AdminSettings from "./pages/AdminSettings";
import AdminLogs from "./pages/AdminLogs";
import AdminPromotions from "./pages/AdminPromotions";
import AdminAnalytics from "./pages/AdminAnalytics";
import BootstrapAdmin from "./pages/BootstrapAdmin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SessionTrackerProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <CookieConsentProvider>
              <AuthGuard>
                <LegalConsentGuard>
                  <ScrollToTop />
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/start" element={<StartProject />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/projet/:id" element={<Project />} />
                    <Route path="/budget" element={<Budget />} />
                    <Route path="/echeancier" element={<Schedule />} />
                    <Route path="/code-batiment" element={<BuildingCode />} />
                    <Route path="/guide" element={<Guide />} />
                    <Route path="/etapes" element={<ConstructionGuide />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/mes-projets" element={<MyProjects />} />
                    <Route path="/galerie" element={<ProjectGallery />} />
                    <Route path="/confidentialite" element={<Privacy />} />
                    <Route path="/conditions" element={<Terms />} />
                    <Route path="/politique-cookies" element={<CookiePolicy />} />
                    <Route path="/forfaits" element={<Plans />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/admin/subscribers" element={<AdminSubscribers />} />
                    <Route path="/admin/plans" element={<AdminPlans />} />
                    <Route path="/admin/payments" element={<AdminPayments />} />
                    <Route path="/admin/settings" element={<AdminSettings />} />
                    <Route path="/admin/logs" element={<AdminLogs />} />
                    <Route path="/admin/promotions" element={<AdminPromotions />} />
                    <Route path="/admin/analytics" element={<AdminAnalytics />} />
                    <Route path="/bootstrap-admin" element={<BootstrapAdmin />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <CookieConsent />
                  <ChatAssistant />
                </LegalConsentGuard>
              </AuthGuard>
            </CookieConsentProvider>
          </BrowserRouter>
        </TooltipProvider>
      </SessionTrackerProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Budget from "./pages/Budget";
import BuildingCode from "./pages/BuildingCode";
import Guide from "./pages/Guide";
import StartProject from "./pages/StartProject";
import ConstructionGuide from "./pages/ConstructionGuide";
import Auth from "./pages/Auth";
import MyProjects from "./pages/MyProjects";
import ProjectGallery from "./pages/ProjectGallery";
import Project from "./pages/Project";
import Schedule from "./pages/Schedule";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
            <Route path="/mes-projets" element={<MyProjects />} />
            <Route path="/galerie" element={<ProjectGallery />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

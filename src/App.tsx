import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Suggestions from "./pages/Suggestions";
import CampaignGenerator from "./pages/CampaignGenerator";
import SandeshAIStudio from "./pages/SandeshAIStudio";
import History from "./pages/History";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Layout><CampaignGenerator /></Layout>} />
            <Route path="/sandesh-studio" element={<SandeshAIStudio />} />
            <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
            <Route path="/generate" element={<Layout><CampaignGenerator /></Layout>} />
            <Route path="/suggestions" element={<Layout><Suggestions /></Layout>} />
            <Route path="/history" element={<Layout><History /></Layout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

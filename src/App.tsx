import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Upload from "./pages/Upload";
import Videos from "./pages/Videos";
import VideoDetail from "./pages/VideoDetail";
import VideoDetailWorkflow from "./pages/VideoDetailWorkflow"; 
import Embed from "./pages/Embed";
import Pricing from "./pages/Pricing";
import Dashboard from "./pages/Dashboard";
import { Auth } from "./pages/Auth";
import Explore from "./pages/Explore";
import PublicVideo from "./pages/PublicVideo";
import PublicBoard from "./pages/PublicBoard";
import Enterprise from "./pages/Enterprise";
import AccessibilityStatement from "./pages/AccessibilityStatement";
import PrivacyPolicy from "./pages/PrivacyPolicy";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/enterprise" element={<Enterprise />} />
            <Route path="/public" element={<PublicBoard />} />
            <Route path="/watch/:id" element={<PublicVideo />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/upload" element={
              <ProtectedRoute>
                <Upload />
              </ProtectedRoute>
            } />
            <Route path="/videos" element={
              <ProtectedRoute>
                <Videos />
              </ProtectedRoute>
            } />
            <Route path="/videos/:id" element={
              <ProtectedRoute>
                <VideoDetail />
              </ProtectedRoute>
            } />
            <Route path="/video/:id/workflow" element={
              <ProtectedRoute>
                <VideoDetailWorkflow />
              </ProtectedRoute>
            } />
            <Route path="/embed/:id" element={<Embed />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/accessibility-statement" element={<AccessibilityStatement />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </SubscriptionProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

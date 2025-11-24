import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { ThemeProvider } from "@/contexts/ThemeContext";
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
import Channel from "./pages/Channel";
import { Auth } from "./pages/Auth";
import { DemoAuth } from "./pages/DemoAuth";
import Explore from "./pages/Explore";
import PublicVideo from "./pages/PublicVideo";
import PublicBoard from "./pages/PublicBoard";
import Enterprise from "./pages/Enterprise";
import AccessibilityStatement from "./pages/AccessibilityStatement";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import AdminSubscribers from "./pages/AdminSubscribers";
import PremiumVideoEditor from "./pages/PremiumVideoEditor";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ThemeProvider>
              <Routes>
                {/* Demo routes - must come before regular routes */}
                <Route path="/interbrand" element={<Index />} />
                <Route path="/interbrand/auth" element={<DemoAuth />} />
                <Route path="/interbrand/explore" element={<Explore />} />
                <Route path="/interbrand/watch/:id" element={<PublicVideo />} />
                <Route path="/interbrand/enterprise" element={<Enterprise />} />
                <Route path="/nike" element={<Index />} />
                <Route path="/nike/auth" element={<DemoAuth />} />
                <Route path="/nike/explore" element={<Explore />} />
                <Route path="/nike/watch/:id" element={<PublicVideo />} />
                <Route path="/nike/enterprise" element={<Enterprise />} />
        <Route path="/cocacola" element={<Index />} />
        <Route path="/cocacola/auth" element={<DemoAuth />} />
        <Route path="/cocacola/explore" element={<Explore />} />
        <Route path="/cocacola/watch/:id" element={<PublicVideo />} />
        <Route path="/cocacola/enterprise" element={<Enterprise />} />

        <Route path="/shell" element={<Index />} />
        <Route path="/shell/auth" element={<DemoAuth />} />
        <Route path="/shell/explore" element={<Explore />} />
        <Route path="/shell/watch/:id" element={<PublicVideo />} />
        <Route path="/shell/enterprise" element={<Enterprise />} />

        <Route path="/fcb" element={<Index />} />
        <Route path="/fcb/auth" element={<DemoAuth />} />
        <Route path="/fcb/explore" element={<Explore />} />
        <Route path="/fcb/watch/:id" element={<PublicVideo />} />
        <Route path="/fcb/enterprise" element={<Enterprise />} />
                
                {/* Regular routes */}
                <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/enterprise" element={<Enterprise />} />
            <Route path="/public" element={<PublicBoard />} />
            <Route path="/watch/:id" element={<PublicVideo />} />
            <Route path="/channel/:id" element={<Channel />} />
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
            <Route path="/admin/subscribers" element={
              <ProtectedRoute>
                <AdminSubscribers />
              </ProtectedRoute>
            } />
            <Route path="/video/:id/edit" element={
              <ProtectedRoute>
                <PremiumVideoEditor />
              </ProtectedRoute>
            } />
            
            <Route path="/accessibility-statement" element={<AccessibilityStatement />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ThemeProvider>
          </BrowserRouter>
        </SubscriptionProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

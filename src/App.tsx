import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Layout from "./components/layout/Layout";
import Index from "./pages/Index";
import Chat from "./pages/Chat";
import Tools from "./pages/Tools";
import Community from "./pages/Community";
import Vision from "./pages/Vision";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import Explore from "./pages/Explore";
import Bookmarks from "./pages/Bookmarks";
import Drafts from "./pages/Drafts";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { trackVisit } from "./lib/trackLogin";
import { registerPushSubscription } from "./lib/pushNotifications";
import { supabase } from "./integrations/supabase/client";
import InstallPrompt from "./components/pwa/InstallPrompt";
import OnboardingFlow from "./components/onboarding/OnboardingFlow";
import DailyRisePopup from "./components/dailyrise/DailyRisePopup";
import DailyRise from "./pages/DailyRise";
import { useOnboarding } from "./hooks/useOnboarding";
import { useDailyRise } from "./hooks/useDailyRise";

const queryClient = new QueryClient();

const AppContent = () => {
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { showPopup: showDailyRise, dismissPopup: dismissDailyRise } = useDailyRise();

  useEffect(() => {
    trackVisit();
  }, []);

  // Register push notifications when user logs in
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        setTimeout(() => {
          registerPushSubscription().catch(console.error);
        }, 2000);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      {showOnboarding && <OnboardingFlow onComplete={completeOnboarding} />}
      <DailyRisePopup open={showDailyRise && !showOnboarding} onClose={dismissDailyRise} />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Index />} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/tools" element={<ProtectedRoute><Tools /></ProtectedRoute>} />
          <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
          <Route path="/vision" element={<Vision />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/messages/:conversationId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/bookmarks" element={<ProtectedRoute><Bookmarks /></ProtectedRoute>} />
          <Route path="/drafts" element={<ProtectedRoute><Drafts /></ProtectedRoute>} />
          <Route path="/explore" element={<Explore />} />
        </Route>
        <Route path="/admin" element={<Admin />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
        <InstallPrompt />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import Layout from "./components/layout/Layout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { trackVisit } from "./lib/trackLogin";
import { registerPushSubscription } from "./lib/pushNotifications";
import { supabase } from "./integrations/supabase/client";
import InstallPrompt from "./components/pwa/InstallPrompt";
import OnboardingFlow from "./components/onboarding/OnboardingFlow";
import DailyRisePopup from "./components/dailyrise/DailyRisePopup";
import { useOnboarding } from "./hooks/useOnboarding";
import { useDailyRise } from "./hooks/useDailyRise";
import { AuthProvider } from "./hooks/useAuthReady";

// Lazy-load non-critical route pages
const Chat = lazy(() => import("./pages/Chat"));
const Tools = lazy(() => import("./pages/Tools"));
const Community = lazy(() => import("./pages/Community"));
const Vision = lazy(() => import("./pages/Vision"));
const Admin = lazy(() => import("./pages/Admin"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const Messages = lazy(() => import("./pages/Messages"));
const Explore = lazy(() => import("./pages/Explore"));
const Bookmarks = lazy(() => import("./pages/Bookmarks"));
const Drafts = lazy(() => import("./pages/Drafts"));
const DailyRise = lazy(() => import("./pages/DailyRise"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 min stale time to reduce refetches
      gcTime: 1000 * 60 * 10, // 10 min garbage collection
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
  </div>
);

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
      <Suspense fallback={<PageLoader />}>
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
            <Route path="/daily-rise" element={<DailyRise />} />
          </Route>
          <Route path="/admin" element={<Admin />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
          <InstallPrompt />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

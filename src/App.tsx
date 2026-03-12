import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";
import Layout from "./components/layout/Layout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { trackVisit } from "./lib/trackLogin";
import { useFeedWarmup } from "./hooks/useFeedWarmup";
import { registerPushSubscription } from "./lib/pushNotifications";
import { supabase } from "./integrations/supabase/client";
import InstallPrompt from "./components/pwa/InstallPrompt";
import OnboardingFlow from "./components/onboarding/OnboardingFlow";
import DailyRisePopup from "./components/dailyrise/DailyRisePopup";
import { useOnboarding } from "./hooks/useOnboarding";
import { useDailyRise } from "./hooks/useDailyRise";
import SpiralPortal from "./components/portal/SpiralPortal";
import { AuthProvider } from "./hooks/useAuthReady";
import ErrorBoundary from "./components/ErrorBoundary";
import { GlobalCallProvider } from "./hooks/useGlobalCalls";

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
const CompanionExplorer = lazy(() => import("./pages/CompanionExplorer"));
const CompanionProfile = lazy(() => import("./pages/CompanionProfile"));
const SleepMode = lazy(() => import("./pages/SleepMode"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
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
  const [showPortal, setShowPortal] = useState(false);

  useEffect(() => {
    trackVisit();
  }, []);

  // Show spiral portal after sign-in (once per session)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        const shown = sessionStorage.getItem("uprising_portal_shown");
        if (!shown) {
          setShowPortal(true);
        }
        setTimeout(() => {
          registerPushSubscription().catch(console.error);
        }, 2000);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handlePortalEnter = () => {
    sessionStorage.setItem("uprising_portal_shown", "1");
    setShowPortal(false);
  };

  // Also show portal after onboarding completes
  const handleOnboardingComplete = () => {
    completeOnboarding();
    setShowPortal(true);
  };

  return (
    <>
      {showOnboarding && <OnboardingFlow onComplete={handleOnboardingComplete} />}
      {showPortal && !showOnboarding && <SpiralPortal onEnter={handlePortalEnter} />}
      <DailyRisePopup open={showDailyRise && !showOnboarding && !showPortal} onClose={dismissDailyRise} />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/chat" element={
              <ProtectedRoute>
                <ErrorBoundary inline>
                  <Chat />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/tools" element={
              <ProtectedRoute>
                <ErrorBoundary inline>
                  <Tools />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/community" element={
              <ProtectedRoute>
                <ErrorBoundary inline>
                  <Community />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/vision" element={
              <ErrorBoundary inline><Vision /></ErrorBoundary>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ErrorBoundary inline><Profile /></ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/profile/:userId" element={
              <ErrorBoundary inline><Profile /></ErrorBoundary>
            } />
            <Route path="/messages" element={
              <ProtectedRoute>
                <ErrorBoundary inline><Messages /></ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/messages/:conversationId" element={
              <ProtectedRoute>
                <ErrorBoundary inline><Messages /></ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/bookmarks" element={
              <ProtectedRoute>
                <ErrorBoundary inline><Bookmarks /></ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/drafts" element={
              <ProtectedRoute>
                <ErrorBoundary inline><Drafts /></ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/explore" element={
              <ErrorBoundary inline><Explore /></ErrorBoundary>
            } />
            <Route path="/daily-rise" element={
              <ErrorBoundary inline><DailyRise /></ErrorBoundary>
            } />
            <Route path="/companions" element={
              <ProtectedRoute>
                <ErrorBoundary inline><CompanionExplorer /></ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/companion/:companionId" element={
              <ErrorBoundary inline><CompanionProfile /></ErrorBoundary>
            } />
            <Route path="/sleep" element={
              <ProtectedRoute>
                <ErrorBoundary inline><SleepMode /></ErrorBoundary>
              </ProtectedRoute>
            } />
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
          <ErrorBoundary>
            <GlobalCallProvider>
              <AppContent />
              <InstallPrompt />
            </GlobalCallProvider>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

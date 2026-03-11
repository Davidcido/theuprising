import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthModal from "@/components/auth/AuthModal";
import { useAuthReady } from "@/hooks/useAuthReady";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isReady } = useAuthReady();
  const [authOpen, setAuthOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // When auth state becomes ready and user is not logged in, auto-open auth modal
  useEffect(() => {
    if (isReady && !user) {
      setAuthOpen(true);
    }
  }, [isReady, user]);

  // After successful login, close modal (user state will update via AuthProvider)
  useEffect(() => {
    if (user && authOpen) {
      setAuthOpen(false);
    }
  }, [user, authOpen]);

  // If user closes auth modal without logging in, redirect to home
  const handleAuthClose = (open: boolean) => {
    setAuthOpen(open);
    if (!open && !user) {
      navigate("/", { replace: true });
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-muted-foreground text-sm">Loading your space…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center py-20">
          <div className="text-center max-w-md mx-4 p-8 rounded-3xl backdrop-blur-xl border border-white/15"
            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)" }}
          >
            <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Account Required</h2>
            <p className="text-muted-foreground text-sm mb-6">
              You must create an account or log in to access this feature.
            </p>
            <Button variant="hero" onClick={() => setAuthOpen(true)} className="w-full">
              Sign Up / Log In
            </Button>
          </div>
        </div>
        <AuthModal open={authOpen} onOpenChange={handleAuthClose} />
      </>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

import { useState } from "react";
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

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-400 border-t-transparent rounded-full" />
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
            <Shield className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Account Required</h2>
            <p className="text-muted-foreground text-sm mb-6">
              You must create an account or log in to access this feature.
            </p>
            <Button variant="hero" onClick={() => setAuthOpen(true)} className="w-full">
              Sign Up / Log In
            </Button>
          </div>
        </div>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

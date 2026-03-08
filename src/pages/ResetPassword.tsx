import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Check, ArrowLeft } from "lucide-react";

const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Also check hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!PASSWORD_REGEX.test(password)) {
      toast.error("Password must be at least 8 characters with letters and numbers.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success("Password reset successfully! Please log in.");
      await supabase.auth.signOut();
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #0a3d2e 0%, #0f5132 50%, #1a7a5a 100%)" }}>
        <div className="max-w-md w-full p-8 rounded-2xl border border-white/15 text-center" style={{ background: "rgba(15, 81, 50, 0.95)" }}>
          <Lock className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Invalid Reset Link</h1>
          <p className="text-white/60 mb-6">This link is expired or invalid. Please request a new password reset.</p>
          <Button variant="hero" onClick={() => navigate("/")} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #0a3d2e 0%, #0f5132 50%, #1a7a5a 100%)" }}>
      <div className="max-w-md w-full p-8 rounded-2xl border border-white/15" style={{ background: "rgba(15, 81, 50, 0.95)" }}>
        <div className="text-center mb-6">
          <Lock className="w-12 h-12 text-primary mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white">Set New Password</h1>
          <p className="text-white/60 text-sm mt-1">Must be at least 8 characters with letters and numbers.</p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/80">New Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white/80">Confirm Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
          </div>
          <Button type="submit" disabled={loading} variant="hero" className="w-full">
            {loading ? "Resetting..." : <><Check className="w-4 h-4 mr-2" /> Reset Password</>}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;

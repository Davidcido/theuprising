import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackLogin, trackSignup } from "@/lib/trackLogin";
import { COUNTRIES } from "@/lib/countries";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ensureProfile = async (userId: string, email?: string) => {
  const { data } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();
  if (!data) {
    await supabase.from("profiles").insert({
      user_id: userId,
      display_name: email?.split("@")[0] || "User",
    });
  }
};

const AuthModal = ({ open, onOpenChange }: AuthModalProps) => {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://theuprising.vercel.app/reset-password",
      });
      toast.success("If an account with that email exists, a reset link has been sent.");
      setMode("login");
    } catch {
      toast.success("If an account with that email exists, a reset link has been sent.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "forgot") return handleForgotPassword(e);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          await supabase.from("profiles").upsert({
            user_id: data.session.user.id,
            display_name: displayName || email.split("@")[0],
            country: country || "",
          }, { onConflict: "user_id" });
          toast.success("Account created! You're now logged in.");
          trackLogin(data.session.user.id);
          trackSignup(data.session.user.id);
          onOpenChange(false);
        } else {
          toast.success("Account created! Check your email to confirm.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await ensureProfile(data.session.user.id, email);
        trackLogin(data.session?.user.id);
        toast.success("Welcome back!");
        onOpenChange(false);
      }
      setEmail("");
      setPassword("");
      setDisplayName("");
      setCountry("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const title = mode === "login" ? "Welcome Back" : mode === "signup" ? "Join The Uprising" : "Reset Password";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-white/20" style={{ background: "rgba(15, 81, 50, 0.95)" }}>
        <DialogHeader>
          <DialogTitle className="text-white text-center text-xl">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/80">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
          </div>

          {mode === "forgot" && (
            <p className="text-white/50 text-xs">Enter your email and we'll send a reset link if an account exists.</p>
          )}

          {mode !== "forgot" && (
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/80">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={mode === "signup" ? 8 : 6}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-xs text-white/50 hover:text-white/80 underline"
                >
                  Forgot Password?
                </button>
              )}
            </div>
          )}

          {mode === "signup" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-white/80">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How should we call you?"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent className="bg-emerald-900 border-white/20 max-h-60">
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code} className="text-white hover:bg-white/10">
                        {c.flag} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <Button type="submit" disabled={loading} className="w-full" variant="hero">
            {loading ? "Loading..." : mode === "login" ? "Log In" : mode === "signup" ? "Sign Up" : "Send Reset Link"}
          </Button>
        </form>
        <p className="text-center text-white/60 text-sm">
          {mode === "forgot" ? (
            <button type="button" onClick={() => setMode("login")} className="text-white underline hover:text-white/80">
              Back to Login
            </button>
          ) : (
            <>
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-white underline hover:text-white/80"
              >
                {mode === "login" ? "Sign Up" : "Log In"}
              </button>
            </>
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;

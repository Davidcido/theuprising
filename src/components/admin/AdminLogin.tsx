import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, LogOut } from "lucide-react";

interface AdminLoginProps {
  isAuthenticated: boolean;
  isAdmin: boolean;
  onLogin: (email: string, password: string) => Promise<boolean>;
  onLogout: () => void;
  error?: string | null;
}

const AdminLogin = ({ isAuthenticated, isAdmin, onLogin, onLogout }: AdminLoginProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onLogin(email, password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a3d24]">
      <Card className="w-full max-w-md mx-4 bg-[#0d4a2e] border-emerald-700">
        <CardHeader className="text-center">
          <Shield className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
          <CardTitle className="text-emerald-100 text-xl">Admin Access</CardTitle>
          {isAuthenticated && !isAdmin && (
            <p className="text-red-400 text-sm mt-2">Your account does not have admin privileges.</p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Admin email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-[#0a3d24] border-emerald-600 text-emerald-100 placeholder:text-emerald-600"
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-[#0a3d24] border-emerald-600 text-emerald-100 placeholder:text-emerald-600"
              required
            />
            <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          {isAuthenticated && !isAdmin && (
            <Button variant="outline" onClick={onLogout} className="w-full mt-3 border-emerald-600 text-emerald-300">
              <LogOut className="w-4 h-4 mr-2" /> Sign out
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;

import { Link, useLocation, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Sparkles, Users, Menu, X, LogIn, LogOut, User, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import AuthModal from "@/components/auth/AuthModal";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import uprisingLogo from "@/assets/uprising-logo.jpeg";
import { toast } from "sonner";

const navItems = [
  { to: "/", label: "Home", icon: Heart },
  { to: "/chat", label: "Talk", icon: MessageCircle },
  { to: "/tools", label: "Healing Tools", icon: Sparkles },
  { to: "/community", label: "Community", icon: Users },
  { to: "/vision", label: "The Uprising", icon: Heart },
];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-white/10"
        style={{ background: "rgba(15, 81, 50, 0.6)" }}
      >
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={uprisingLogo}
              alt="The Uprising"
              className="w-9 h-9 rounded-xl object-cover shadow-md"
            />
            <span className="font-display font-bold text-lg text-white">Uprising</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "bg-white/20 text-white border border-white/20"
                      : "text-white/60 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}

            {session && (
              <>
                <button
                  onClick={() => navigate("/messages")}
                  className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  <Mail className="w-5 h-5" />
                </button>
                <NotificationBell userId={session.user.id} />
                <button
                  onClick={() => navigate("/profile")}
                  className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  <User className="w-5 h-5" />
                </button>
              </>
            )}

            {session ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="ml-1 text-white/60 hover:text-white hover:bg-white/10"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Log Out
              </Button>
            ) : (
              <Button
                variant="hero"
                size="sm"
                onClick={() => setAuthOpen(true)}
                className="ml-2"
              >
                <LogIn className="w-4 h-4 mr-1" />
                Sign Up / Log In
              </Button>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="md:hidden flex items-center gap-1">
            {session && (
              <>
                <button
                  onClick={() => navigate("/messages")}
                  className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  <Mail className="w-4 h-4" />
                </button>
                <NotificationBell userId={session.user.id} />
              </>
            )}
            <button
              className="p-2 rounded-xl hover:bg-white/10 text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-b border-white/10 backdrop-blur-xl"
              style={{ background: "rgba(15, 81, 50, 0.9)" }}
            >
              <div className="px-4 py-3 flex flex-col gap-1">
                {navItems.map((item) => {
                  const active = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? "bg-white/20 text-white"
                          : "text-white/60 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
                {session && (
                  <>
                    <Link
                      to="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <User className="w-4 h-4" />
                      My Profile
                    </Link>
                    <Link
                      to="/messages"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <Mail className="w-4 h-4" />
                      Messages
                    </Link>
                  </>
                )}
                {session ? (
                  <button
                    onClick={() => { handleLogout(); setMobileOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                ) : (
                  <button
                    onClick={() => { setAuthOpen(true); setMobileOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white hover:bg-white/10"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign Up / Log In
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
};

export default Navbar;

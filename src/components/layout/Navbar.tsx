import { Link, useLocation } from "react-router-dom";
import { Heart, MessageCircle, Sparkles, Users, Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import uprisingLogo from "@/assets/uprising-logo.jpeg";

const navItems = [
  { to: "/", label: "Home", icon: Heart },
  { to: "/chat", label: "Talk", icon: MessageCircle },
  { to: "/tools", label: "Healing Tools", icon: Sparkles },
  { to: "/community", label: "Community", icon: Users },
  { to: "/vision", label: "The Uprising", icon: Heart },
];

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
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
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-xl hover:bg-white/10 text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;

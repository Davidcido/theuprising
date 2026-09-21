import { NavLink, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { jdgEmblemUrl } from "@/data/jdgProducts";
import { cn } from "@/lib/utils";

const links = [
  { to: "/brand", label: "JDG", end: true },
  { to: "/brand/collection", label: "Collection" },
  { to: "/brand/lookbook", label: "Lookbook" },
  { to: "/brand/story", label: "Our Story" },
  { to: "/brand/shop", label: "Shop" },
];

const JdgShell = () => (
  <div className="jdg-theme min-h-[calc(100dvh-4rem)] bg-jdg-ink text-jdg-bone">
    <header className="sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-40 border-b border-jdg-gold/20 bg-jdg-ink/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-4 sm:px-8">
        <NavLink to="/brand" className="flex shrink-0 items-center gap-2" aria-label="JDG home">
          <img src={jdgEmblemUrl} alt="" className="h-9 w-7 object-contain mix-blend-screen" />
          <span className="font-display text-sm font-semibold tracking-[0.22em] text-jdg-gold">JDG</span>
        </NavLink>
        <nav aria-label="JDG" className="flex min-w-0 flex-1 gap-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => cn(
                "relative flex h-16 shrink-0 items-center text-[11px] font-medium uppercase tracking-[0.16em] text-jdg-muted transition-colors hover:text-jdg-bone",
                isActive && "text-jdg-gold",
              )}
            >
              {({ isActive }) => <>{link.label}{isActive && <motion.span layoutId="jdg-nav" className="absolute inset-x-0 bottom-0 h-px bg-jdg-gold" />}</>}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
    <Outlet />
    <footer className="border-t border-jdg-gold/20 px-4 py-10 text-center">
      <p className="text-[10px] uppercase tracking-[0.28em] text-jdg-muted">JDG · The Rebirth of Self</p>
    </footer>
  </div>
);

export default JdgShell;
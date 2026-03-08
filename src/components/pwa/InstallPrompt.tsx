import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed recently
    const dismissedAt = localStorage.getItem("pwa-install-dismissed");
    if (dismissedAt && Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", String(Date.now()));
  };

  if (dismissed || !showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-md"
      >
        <div className="rounded-2xl border border-white/20 p-4 backdrop-blur-xl shadow-lg"
          style={{ background: "rgba(15, 81, 50, 0.95)" }}
        >
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white/10 p-2.5">
              <Download className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-display font-semibold text-white text-sm">
                Install Uprising App
              </p>
              <p className="text-white/60 text-xs mt-0.5">
                Add to your home screen for a better experience
              </p>
            </div>
            <button onClick={handleDismiss} className="text-white/40 hover:text-white/70 p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={handleDismiss}
              className="flex-1 text-white/60 hover:text-white hover:bg-white/10 text-xs">
              Not now
            </Button>
            <Button variant="hero" size="sm" onClick={handleInstall} className="flex-1 text-xs">
              <Download className="h-3.5 w-3.5 mr-1" />
              Install
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InstallPrompt;

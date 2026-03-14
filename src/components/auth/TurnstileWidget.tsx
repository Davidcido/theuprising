import { useEffect, useRef } from "react";

const SITE_KEY = "0x4AAAAAACq2V_zzxtr2USjQ";

interface TurnstileWidgetProps {
  onToken: (token: string | null) => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const TurnstileWidget = ({ onToken }: TurnstileWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Store callback in ref to avoid stale closures
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    const renderWidget = () => {
      if (!containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
      console.log("[Turnstile] Rendering widget...");
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (token: string) => {
          console.log("[Turnstile] Token received:", token ? `${token.slice(0, 20)}...` : "null");
          onTokenRef.current(token);
        },
        "expired-callback": () => {
          console.log("[Turnstile] Token expired");
          onTokenRef.current(null);
        },
        "error-callback": (errorCode: string) => {
          console.error("[Turnstile] Error:", errorCode);
          onTokenRef.current(null);
        },
        size: "invisible",
        appearance: "interaction-only",
        execution: "render",
      });
      console.log("[Turnstile] Widget ID:", widgetIdRef.current);
    };

    if (!document.getElementById("cf-turnstile-script")) {
      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit";
      script.async = true;
      window.onTurnstileLoad = renderWidget;
      document.head.appendChild(script);
    } else if (window.turnstile) {
      renderWidget();
    } else {
      window.onTurnstileLoad = renderWidget;
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} />;
};

export default TurnstileWidget;

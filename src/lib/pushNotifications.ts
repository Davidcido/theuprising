import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerPushSubscription(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.log("Push notifications not supported");
    return false;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.warn("VAPID public key not configured");
    return false;
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied");
      return false;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register("/sw-push.js");
    await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userActivated: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      } as any);
    }

    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const subJSON = subscription.toJSON();

    // Store subscription in database
    await supabase.from("push_subscriptions").upsert(
      {
        user_id: session.user.id,
        endpoint: subJSON.endpoint!,
        keys: subJSON.keys as any,
      } as any,
      { onConflict: "user_id,endpoint" }
    );

    return true;
  } catch (error) {
    console.error("Push subscription failed:", error);
    return false;
  }
}

export async function unregisterPushSubscription(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw-push.js");
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", session.user.id)
          .eq("endpoint", endpoint);
      }
    }
  } catch (error) {
    console.error("Push unsubscribe failed:", error);
  }
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function getPushPermissionState(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

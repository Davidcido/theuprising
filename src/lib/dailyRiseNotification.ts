const NOTIFICATION_KEY = "uprising_daily_rise_notif_sent";

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function sendLocalDailyRiseReminder() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const today = new Date().toDateString();
  const lastSent = localStorage.getItem(NOTIFICATION_KEY);
  if (lastSent === today) return;

  localStorage.setItem(NOTIFICATION_KEY, today);

  // Schedule notification after a short delay
  setTimeout(() => {
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "DAILY_RISE_REMINDER",
          title: "Your Daily Rise is ready ☀️",
          body: "Take a moment to reflect and start fresh.",
          url: "/daily-rise",
        });
      } else {
        new Notification("Your Daily Rise is ready ☀️", {
          body: "Take a moment to reflect and start fresh.",
          icon: "/pwa-icon-192.png",
          tag: "daily-rise",
        });
      }
    } catch {
      // Best effort
    }
  }, 3000);
}

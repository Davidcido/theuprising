import { useState, useEffect } from "react";

const DAILY_RISE_KEY = "uprising_daily_rise_viewed";

export const useDailyRise = () => {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const today = new Date().toDateString();
    const lastViewed = localStorage.getItem(DAILY_RISE_KEY);
    if (lastViewed !== today) {
      // Small delay so it doesn't block initial render
      const timer = setTimeout(() => setShowPopup(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissPopup = () => {
    localStorage.setItem(DAILY_RISE_KEY, new Date().toDateString());
    setShowPopup(false);
  };

  return { showPopup, dismissPopup };
};

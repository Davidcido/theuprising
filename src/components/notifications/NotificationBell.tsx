import { useState, useRef, useEffect } from "react";
import { Bell, Check, CheckCheck, UserPlus, Heart, MessageCircle, Mail, Repeat2, Sparkles } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const ICON_MAP: Record<string, typeof Bell> = {
  follow: UserPlus,
  like: Heart,
  comment: MessageCircle,
  reply: MessageCircle,
  message: Mail,
};

interface NotificationBellProps {
  userId?: string;
}

const NotificationBell = ({ userId }: NotificationBellProps) => {
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications(userId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleNotificationClick = (n: any) => {
    if (!n.read) markAsRead(n.id);
    // Navigate based on notification type
    if (n.type === "follow" && n.actor_id) {
      navigate(`/profile/${n.actor_id}`);
    } else if ((n.type === "like" || n.type === "comment" || n.type === "reaction") && n.reference_id) {
      navigate("/community");
    } else if (n.type === "message" && n.reference_id) {
      navigate(`/messages/${n.reference_id}`);
    }
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!userId) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto rounded-2xl border border-white/15 backdrop-blur-xl shadow-2xl z-50"
            style={{ background: "rgba(15, 81, 50, 0.95)" }}
          >
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <h3 className="text-white font-semibold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="p-6 text-center text-white/40 text-sm">No notifications yet</div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map((n) => {
                  const Icon = ICON_MAP[n.type] || Bell;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left px-3 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors ${
                        !n.read ? "bg-emerald-500/10" : ""
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/90">
                          <span className="font-semibold">
                            {n.actor_profile?.display_name || "Someone"}
                          </span>{" "}
                          {n.content}
                        </p>
                        <p className="text-xs text-white/40 mt-0.5">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;

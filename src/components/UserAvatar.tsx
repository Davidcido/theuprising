import { cn } from "@/lib/utils";

// Deterministic color from string
const AVATAR_COLORS = [
  "bg-emerald-500", "bg-teal-500", "bg-cyan-500", "bg-sky-500",
  "bg-indigo-500", "bg-violet-500", "bg-purple-500", "bg-fuchsia-500",
  "bg-pink-500", "bg-rose-500", "bg-amber-500", "bg-lime-500",
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

interface UserAvatarProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showStatus?: boolean;
  onlineStatus?: string | null;
  onClick?: () => void;
  className?: string;
}

const SIZE_MAP = {
  xs: "w-7 h-7 text-[10px]",
  sm: "w-9 h-9 text-xs",
  md: "w-12 h-12 text-sm",
  lg: "w-16 h-16 text-lg",
  xl: "w-24 h-24 text-2xl",
};

const STATUS_SIZE_MAP = {
  xs: "w-2 h-2 border",
  sm: "w-2.5 h-2.5 border-[1.5px]",
  md: "w-3 h-3 border-2",
  lg: "w-3.5 h-3.5 border-2",
  xl: "w-4 h-4 border-2",
};

const UserAvatar = ({
  avatarUrl,
  displayName,
  size = "sm",
  showStatus = false,
  onlineStatus,
  onClick,
  className,
}: UserAvatarProps) => {
  const name = displayName || "?";
  const initial = name[0]?.toUpperCase() || "?";
  const colorClass = AVATAR_COLORS[hashCode(name) % AVATAR_COLORS.length];
  const isEmoji = avatarUrl?.startsWith("emoji:");
  const isOnline = onlineStatus === "online";

  return (
    <div
      className={cn(
        "relative shrink-0 rounded-full overflow-visible",
        onClick && "cursor-pointer hover:ring-2 hover:ring-emerald-400/40 transition-all",
        className
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "rounded-full flex items-center justify-center font-bold shadow-md overflow-hidden",
          SIZE_MAP[size],
          !avatarUrl || isEmoji ? colorClass : ""
        )}
        style={!avatarUrl || isEmoji ? undefined : undefined}
      >
        {isEmoji ? (
          <span className={size === "xl" ? "text-4xl" : size === "lg" ? "text-2xl" : "text-lg"}>
            {avatarUrl!.replace("emoji:", "")}
          </span>
        ) : avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              // Fallback to initial on load error
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).parentElement!.classList.add(colorClass);
            }}
          />
        ) : (
          <span className="text-white font-bold">{initial}</span>
        )}
      </div>

      {showStatus && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-background",
            STATUS_SIZE_MAP[size],
            isOnline ? "bg-emerald-400" : "bg-muted-foreground/50"
          )}
        />
      )}
    </div>
  );
};

export default UserAvatar;

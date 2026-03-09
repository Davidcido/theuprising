import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import UserAvatar from "@/components/UserAvatar";

interface MentionUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface MentionDropdownProps {
  query: string; // text after @
  onSelect: (user: MentionUser) => void;
  visible: boolean;
  position?: { top: number; left: number };
}

const MentionDropdown = ({ query, onSelect, visible, position }: MentionDropdownProps) => {
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible || !query) {
      setUsers([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .ilike("display_name", `%${query}%`)
        .limit(6);
      setUsers(data || []);
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [query, visible]);

  if (!visible || (!loading && users.length === 0 && query.length > 0)) return null;

  return (
    <div
      ref={ref}
      className="absolute z-50 w-56 max-h-48 overflow-y-auto rounded-xl border border-white/15 bg-card shadow-xl backdrop-blur-xl"
      style={position ? { top: position.top, left: position.left } : { bottom: "100%", left: 0, marginBottom: 4 }}
    >
      {loading ? (
        <div className="px-3 py-2 text-xs text-muted-foreground">Searching...</div>
      ) : (
        users.map((user) => (
          <button
            key={user.user_id}
            onClick={() => onSelect(user)}
            className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-white/10 transition-colors"
          >
            <UserAvatar
              avatarUrl={user.avatar_url || undefined}
              displayName={user.display_name || "User"}
              size="xs"
            />
            <span className="text-xs font-medium text-foreground truncate">
              {user.display_name || "User"}
            </span>
          </button>
        ))
      )}
    </div>
  );
};

export default MentionDropdown;

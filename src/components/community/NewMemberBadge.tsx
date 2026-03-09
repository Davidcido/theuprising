import { Sparkles } from "lucide-react";

interface NewMemberBadgeProps {
  createdAt?: string;
}

const NEW_MEMBER_HOURS = 48;

const NewMemberBadge = ({ createdAt }: NewMemberBadgeProps) => {
  if (!createdAt) return null;
  
  const joinedAt = new Date(createdAt).getTime();
  const now = Date.now();
  const hoursAgo = (now - joinedAt) / (1000 * 60 * 60);
  
  if (hoursAgo > NEW_MEMBER_HOURS) return null;

  return (
    <span className="inline-flex items-center gap-0.5 ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
      <Sparkles className="w-2.5 h-2.5" />
      New Member
    </span>
  );
};

export default NewMemberBadge;

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ban } from "lucide-react";

interface BannedUser {
  id: string;
  session_id: string;
  reason: string | null;
  banned_at: string;
}

interface BansTabProps {
  bannedUsers: BannedUser[];
  onBan: (sessionId: string, reason: string) => Promise<boolean>;
  onUnban: (id: string) => void;
}

const BansTab = ({ bannedUsers, onBan, onUnban }: BansTabProps) => {
  const [sessionId, setSessionId] = useState("");
  const [reason, setReason] = useState("");

  const handleBan = async () => {
    if (!sessionId.trim()) return;
    const success = await onBan(sessionId, reason);
    if (success) { setSessionId(""); setReason(""); }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-[#0d4a2e] border-emerald-700">
        <CardContent className="p-4">
          <p className="text-sm text-emerald-400 mb-3">Ban a user by session ID</p>
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Session ID"
              value={sessionId}
              onChange={e => setSessionId(e.target.value)}
              className="bg-[#0a3d24] border-emerald-600 text-emerald-100 flex-1 min-w-[200px]"
            />
            <Input
              placeholder="Reason (optional)"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="bg-[#0a3d24] border-emerald-600 text-emerald-100 flex-1 min-w-[200px]"
            />
            <Button onClick={handleBan} className="bg-red-700 hover:bg-red-600">
              <Ban className="w-4 h-4 mr-2" /> Ban
            </Button>
          </div>
        </CardContent>
      </Card>

      {bannedUsers.map(ban => (
        <Card key={ban.id} className="bg-[#0d4a2e] border-emerald-700">
          <CardContent className="p-4">
            <div className="flex justify-between items-center gap-4">
              <div>
                <p className="text-emerald-100 font-mono text-sm">{ban.session_id}</p>
                <p className="text-xs text-emerald-500">{ban.reason || "No reason"} · {new Date(ban.banned_at).toLocaleDateString()}</p>
              </div>
              <Button size="sm" variant="outline" className="border-emerald-600 text-emerald-300" onClick={() => onUnban(ban.id)}>
                Unban
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {bannedUsers.length === 0 && <p className="text-emerald-500 text-center py-4">No banned users</p>}
    </div>
  );
};

export default BansTab;

import { Card, CardContent } from "@/components/ui/card";
import { FileText, MessageSquare, AlertTriangle, Ban, Users, Heart } from "lucide-react";

interface AdminStatsProps {
  postsCount: number;
  commentsCount: number;
  pendingReportsCount: number;
  bannedCount: number;
  totalLikes: number;
}

const AdminStats = ({ postsCount, commentsCount, pendingReportsCount, bannedCount, totalLikes }: AdminStatsProps) => {
  const stats = [
    { label: "Posts", count: postsCount, icon: FileText, color: "text-emerald-400" },
    { label: "Comments", count: commentsCount, icon: MessageSquare, color: "text-blue-400" },
    { label: "Likes", count: totalLikes, icon: Heart, color: "text-red-400" },
    { label: "Reports", count: pendingReportsCount, icon: AlertTriangle, color: "text-yellow-400" },
    { label: "Banned", count: bannedCount, icon: Ban, color: "text-orange-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      {stats.map(s => (
        <Card key={s.label} className="bg-[#0d4a2e] border-emerald-700">
          <CardContent className="p-4 flex items-center gap-3">
            <s.icon className={`w-5 h-5 ${s.color}`} />
            <div>
              <p className="text-2xl font-bold text-emerald-100">{s.count}</p>
              <p className="text-sm text-emerald-400">{s.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminStats;

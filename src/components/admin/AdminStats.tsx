import { Card, CardContent } from "@/components/ui/card";
import { FileText, MessageSquare, AlertTriangle, Ban, Heart, LogIn, Eye, UserPlus } from "lucide-react";

interface AdminStatsProps {
  postsCount: number;
  commentsCount: number;
  pendingReportsCount: number;
  bannedCount: number;
  totalLikes: number;
  totalLogins: number;
  loginsToday: number;
  totalVisitors: number;
  visitorsToday: number;
  totalSignups: number;
  signupsToday: number;
}

const AdminStats = (props: AdminStatsProps) => {
  const stats = [
    { label: "Visitors", count: props.totalVisitors, icon: Eye, color: "text-purple-400", sub: `${props.visitorsToday} today` },
    { label: "Users", count: props.totalSignups, icon: UserPlus, color: "text-teal-400", sub: `${props.signupsToday} new today` },
    { label: "Logins", count: props.totalLogins, icon: LogIn, color: "text-cyan-400", sub: `${props.loginsToday} today` },
    { label: "Posts", count: props.postsCount, icon: FileText, color: "text-emerald-400" },
    { label: "Likes", count: props.totalLikes, icon: Heart, color: "text-red-400" },
    { label: "Reports", count: props.pendingReportsCount, icon: AlertTriangle, color: "text-yellow-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {stats.map(s => (
        <Card key={s.label} className="bg-[#0d4a2e] border-emerald-700">
          <CardContent className="p-4 flex items-center gap-3">
            <s.icon className={`w-5 h-5 ${s.color}`} />
            <div>
              <p className="text-2xl font-bold text-emerald-100">{s.count}</p>
              <p className="text-sm text-emerald-400">{s.label}</p>
              {"sub" in s && s.sub && <p className="text-xs text-emerald-500">{s.sub}</p>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminStats;

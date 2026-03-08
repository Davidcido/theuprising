import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, LogOut } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminData } from "@/hooks/useAdminData";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminStats from "@/components/admin/AdminStats";
import CommunityControl from "@/components/admin/CommunityControl";
import PostsTab from "@/components/admin/PostsTab";
import CommentsTab from "@/components/admin/CommentsTab";
import ReportsTab from "@/components/admin/ReportsTab";
import BansTab from "@/components/admin/BansTab";

const Admin = () => {
  const { isAuthenticated, isAdmin, loading, login, logout } = useAdminAuth();
  const {
    posts, comments, reports, bannedUsers, communityStatus, totalLikes,
    fetchAllData, deletePost, deleteComment, updateReportStatus,
    banUser, unbanUser, toggleCommunityStatus,
  } = useAdminData();

  useEffect(() => {
    if (isAdmin) fetchAllData();
  }, [isAdmin, fetchAllData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a3d24]">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return <AdminLogin isAuthenticated={isAuthenticated} isAdmin={isAdmin} onLogin={login} onLogout={logout} />;
  }

  return (
    <div className="min-h-screen bg-[#0a3d24] text-emerald-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-emerald-400" />
            <h1 className="text-2xl font-bold text-emerald-100">Admin Dashboard</h1>
          </div>
          <Button variant="outline" onClick={logout} className="border-emerald-600 text-emerald-300 hover:bg-emerald-800">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>

        <AdminStats
          postsCount={posts.length}
          commentsCount={comments.length}
          pendingReportsCount={reports.filter(r => r.status === "pending").length}
          bannedCount={bannedUsers.length}
          totalLikes={totalLikes}
        />

        <CommunityControl communityStatus={communityStatus} onToggle={toggleCommunityStatus} />

        <Tabs defaultValue="posts" className="space-y-4">
          <TabsList className="bg-[#0d4a2e] border border-emerald-700">
            <TabsTrigger value="posts" className="data-[state=active]:bg-emerald-700 text-emerald-300">Posts</TabsTrigger>
            <TabsTrigger value="comments" className="data-[state=active]:bg-emerald-700 text-emerald-300">Comments</TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-emerald-700 text-emerald-300">Reports</TabsTrigger>
            <TabsTrigger value="bans" className="data-[state=active]:bg-emerald-700 text-emerald-300">Bans</TabsTrigger>
          </TabsList>

          <TabsContent value="posts"><PostsTab posts={posts} onDelete={deletePost} /></TabsContent>
          <TabsContent value="comments"><CommentsTab comments={comments} onDelete={deleteComment} /></TabsContent>
          <TabsContent value="reports"><ReportsTab reports={reports} onUpdateStatus={updateReportStatus} /></TabsContent>
          <TabsContent value="bans"><BansTab bannedUsers={bannedUsers} onBan={banUser} onUnban={unbanUser} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;

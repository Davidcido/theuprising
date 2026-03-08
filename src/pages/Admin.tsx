import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, LogOut, RefreshCw, AlertTriangle } from "lucide-react";
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
  const { isAuthenticated, isAdmin, loading, error: authError, login, logout } = useAdminAuth();
  const {
    posts, comments, reports, bannedUsers, communityStatus, totalLikes,
    dataLoading, dataError,
    fetchAllData, deletePost, deleteComment, updateReportStatus,
    banUser, unbanUser, toggleCommunityStatus,
  } = useAdminData();

  useEffect(() => {
    if (isAdmin) fetchAllData();
  }, [isAdmin, fetchAllData]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a3d24] gap-4">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-400 border-t-transparent rounded-full" />
        <p className="text-emerald-400 text-sm">Verifying admin access...</p>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <AdminLogin
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        onLogin={login}
        onLogout={logout}
        error={authError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a3d24] text-emerald-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-emerald-400" />
            <h1 className="text-2xl font-bold text-emerald-100">Admin Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchAllData}
              disabled={dataLoading}
              className="border-emerald-600 text-emerald-300 hover:bg-emerald-800"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${dataLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="outline" onClick={logout} className="border-emerald-600 text-emerald-300 hover:bg-emerald-800">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>

        {dataError && (
          <div className="mb-6 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
            <p className="text-yellow-300 text-sm">{dataError}</p>
            <Button size="sm" onClick={fetchAllData} className="ml-auto bg-yellow-600 hover:bg-yellow-700 text-white">
              Retry
            </Button>
          </div>
        )}

        {dataLoading && !posts.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin h-8 w-8 border-4 border-emerald-400 border-t-transparent rounded-full" />
            <p className="text-emerald-400 text-sm">Loading admin data...</p>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;

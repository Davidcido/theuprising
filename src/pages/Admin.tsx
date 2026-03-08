import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Ban, Eye, EyeOff, LogOut, Shield, AlertTriangle, MessageSquare, FileText } from "lucide-react";
import { toast } from "sonner";

interface Post {
  id: string;
  content: string;
  anonymous_name: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

interface Comment {
  id: string;
  content: string;
  anonymous_name: string;
  created_at: string;
  post_id: string;
}

interface Report {
  id: string;
  content_type: string;
  content_id: string;
  reason: string | null;
  reporter_session_id: string;
  status: string;
  created_at: string;
}

interface BannedUser {
  id: string;
  session_id: string;
  reason: string | null;
  banned_at: string;
}

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [banSessionId, setBanSessionId] = useState("");
  const [banReason, setBanReason] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        // Check admin role
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin");
        
        if (data && data.length > 0) {
          setIsAdmin(true);
          fetchAllData();
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAllData = async () => {
    const [postsRes, commentsRes, reportsRes, bannedRes] = await Promise.all([
      supabase.from("community_posts").select("*").order("created_at", { ascending: false }),
      supabase.from("community_comments").select("*").order("created_at", { ascending: false }),
      supabase.from("reported_content").select("*").order("created_at", { ascending: false }),
      supabase.from("banned_users").select("*").order("banned_at", { ascending: false }),
    ]);
    if (postsRes.data) setPosts(postsRes.data);
    if (commentsRes.data) setComments(commentsRes.data);
    if (reportsRes.data) setReports(reportsRes.data);
    if (bannedRes.data) setBannedUsers(bannedRes.data);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error("Login failed: " + error.message);
    }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
  };

  const deletePost = async (id: string) => {
    // Delete related comments, likes, reactions first
    await Promise.all([
      supabase.from("community_comments").delete().eq("post_id", id),
      supabase.from("community_likes").delete().eq("post_id", id),
      supabase.from("community_reactions").delete().eq("post_id", id),
    ]);
    const { error } = await supabase.from("community_posts").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete post");
    } else {
      setPosts(posts.filter(p => p.id !== id));
      toast.success("Post deleted");
    }
  };

  const deleteComment = async (id: string) => {
    const { error } = await supabase.from("community_comments").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete comment");
    } else {
      setComments(comments.filter(c => c.id !== id));
      toast.success("Comment deleted");
    }
  };

  const updateReportStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("reported_content").update({ status }).eq("id", id);
    if (error) {
      toast.error("Failed to update report");
    } else {
      setReports(reports.map(r => r.id === id ? { ...r, status } : r));
      toast.success("Report updated");
    }
  };

  const banUser = async () => {
    if (!banSessionId.trim()) return;
    const session = await supabase.auth.getSession();
    const { error } = await supabase.from("banned_users").insert({
      session_id: banSessionId.trim(),
      reason: banReason.trim() || null,
      banned_by: session.data.session?.user.id,
    });
    if (error) {
      toast.error("Failed to ban user: " + error.message);
    } else {
      setBanSessionId("");
      setBanReason("");
      fetchAllData();
      toast.success("User banned");
    }
  };

  const unbanUser = async (id: string) => {
    const { error } = await supabase.from("banned_users").delete().eq("id", id);
    if (error) {
      toast.error("Failed to unban user");
    } else {
      setBannedUsers(bannedUsers.filter(b => b.id !== id));
      toast.success("User unbanned");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a3d24]">
        <Card className="w-full max-w-md mx-4 bg-[#0d4a2e] border-emerald-700">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
            <CardTitle className="text-emerald-100 text-xl">Admin Access</CardTitle>
            {isAuthenticated && !isAdmin && (
              <p className="text-red-400 text-sm mt-2">Your account does not have admin privileges.</p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="email"
                placeholder="Admin email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-[#0a3d24] border-emerald-600 text-emerald-100 placeholder:text-emerald-600"
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-[#0a3d24] border-emerald-600 text-emerald-100 placeholder:text-emerald-600"
                required
              />
              <Button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loginLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            {isAuthenticated && !isAdmin && (
              <Button variant="outline" onClick={handleLogout} className="w-full mt-3 border-emerald-600 text-emerald-300">
                Sign out
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
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
          <Button variant="outline" onClick={handleLogout} className="border-emerald-600 text-emerald-300 hover:bg-emerald-800">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Posts", count: posts.length, icon: FileText },
            { label: "Comments", count: comments.length, icon: MessageSquare },
            { label: "Reports", count: reports.filter(r => r.status === "pending").length, icon: AlertTriangle },
            { label: "Banned", count: bannedUsers.length, icon: Ban },
          ].map(s => (
            <Card key={s.label} className="bg-[#0d4a2e] border-emerald-700">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-2xl font-bold text-emerald-100">{s.count}</p>
                  <p className="text-sm text-emerald-400">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="posts" className="space-y-4">
          <TabsList className="bg-[#0d4a2e] border border-emerald-700">
            <TabsTrigger value="posts" className="data-[state=active]:bg-emerald-700 text-emerald-300">Posts</TabsTrigger>
            <TabsTrigger value="comments" className="data-[state=active]:bg-emerald-700 text-emerald-300">Comments</TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-emerald-700 text-emerald-300">Reports</TabsTrigger>
            <TabsTrigger value="bans" className="data-[state=active]:bg-emerald-700 text-emerald-300">Bans</TabsTrigger>
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-3">
            {posts.map(post => (
              <Card key={post.id} className="bg-[#0d4a2e] border-emerald-700">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-emerald-400 mb-1">{post.anonymous_name} · {new Date(post.created_at).toLocaleDateString()}</p>
                      <p className="text-emerald-100 break-words">{post.content}</p>
                      <p className="text-xs text-emerald-500 mt-2">❤️ {post.likes_count} · 💬 {post.comments_count}</p>
                    </div>
                    <Button size="sm" variant="destructive" onClick={() => deletePost(post.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {posts.length === 0 && <p className="text-emerald-500 text-center py-8">No posts yet</p>}
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="space-y-3">
            {comments.map(comment => (
              <Card key={comment.id} className="bg-[#0d4a2e] border-emerald-700">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-emerald-400 mb-1">{comment.anonymous_name} · {new Date(comment.created_at).toLocaleDateString()}</p>
                      <p className="text-emerald-100 break-words">{comment.content}</p>
                      <p className="text-xs text-emerald-500 mt-1">Post: {comment.post_id.slice(0, 8)}...</p>
                    </div>
                    <Button size="sm" variant="destructive" onClick={() => deleteComment(comment.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {comments.length === 0 && <p className="text-emerald-500 text-center py-8">No comments yet</p>}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-3">
            {reports.map(report => (
              <Card key={report.id} className="bg-[#0d4a2e] border-emerald-700">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-emerald-400 mb-1">
                        {report.content_type.toUpperCase()} · {new Date(report.created_at).toLocaleDateString()}
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                          report.status === "pending" ? "bg-yellow-600/30 text-yellow-300" :
                          report.status === "reviewed" ? "bg-emerald-600/30 text-emerald-300" :
                          "bg-gray-600/30 text-gray-300"
                        }`}>{report.status}</span>
                      </p>
                      <p className="text-emerald-100">{report.reason || "No reason provided"}</p>
                      <p className="text-xs text-emerald-500 mt-1">Content ID: {report.content_id.slice(0, 8)}...</p>
                    </div>
                    <div className="flex gap-2">
                      {report.status === "pending" && (
                        <>
                          <Button size="sm" className="bg-emerald-700 hover:bg-emerald-600" onClick={() => updateReportStatus(report.id, "reviewed")}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="border-emerald-600" onClick={() => updateReportStatus(report.id, "dismissed")}>
                            <EyeOff className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {reports.length === 0 && <p className="text-emerald-500 text-center py-8">No reports</p>}
          </TabsContent>

          {/* Bans Tab */}
          <TabsContent value="bans" className="space-y-4">
            <Card className="bg-[#0d4a2e] border-emerald-700">
              <CardContent className="p-4">
                <p className="text-sm text-emerald-400 mb-3">Ban a user by session ID</p>
                <div className="flex gap-2 flex-wrap">
                  <Input
                    placeholder="Session ID"
                    value={banSessionId}
                    onChange={e => setBanSessionId(e.target.value)}
                    className="bg-[#0a3d24] border-emerald-600 text-emerald-100 flex-1 min-w-[200px]"
                  />
                  <Input
                    placeholder="Reason (optional)"
                    value={banReason}
                    onChange={e => setBanReason(e.target.value)}
                    className="bg-[#0a3d24] border-emerald-600 text-emerald-100 flex-1 min-w-[200px]"
                  />
                  <Button onClick={banUser} className="bg-red-700 hover:bg-red-600">
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
                    <Button size="sm" variant="outline" className="border-emerald-600 text-emerald-300" onClick={() => unbanUser(ban.id)}>
                      Unban
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {bannedUsers.length === 0 && <p className="text-emerald-500 text-center py-4">No banned users</p>}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;

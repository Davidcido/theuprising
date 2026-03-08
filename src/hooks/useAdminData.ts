import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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

export interface LoginSession {
  id: string;
  user_id: string | null;
  session_id: string;
  login_time: string;
  country: string | null;
  device_type: string | null;
}

export interface Visitor {
  id: string;
  session_id: string;
  visit_time: string;
  device_type: string | null;
  country: string | null;
}

export interface Signup {
  id: string;
  user_id: string | null;
  signup_time: string;
}

const getTodayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const useAdminData = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [communityStatus, setCommunityStatus] = useState<string>("open");
  const [totalLikes, setTotalLikes] = useState(0);
  const [loginSessions, setLoginSessions] = useState<LoginSession[]>([]);
  const [loginsToday, setLoginsToday] = useState(0);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [visitorsToday, setVisitorsToday] = useState(0);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [signupsToday, setSignupsToday] = useState(0);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    setDataLoading(true);
    setDataError(null);
    try {
      const [postsRes, commentsRes, reportsRes, bannedRes, settingsRes, likesRes, loginsRes, visitorsRes, signupsRes] = await Promise.all([
        supabase.from("community_posts").select("*").order("created_at", { ascending: false }),
        supabase.from("community_comments").select("*").order("created_at", { ascending: false }),
        supabase.from("reported_content").select("*").order("created_at", { ascending: false }),
        supabase.from("banned_users").select("*").order("banned_at", { ascending: false }),
        supabase.from("community_settings").select("*").eq("key", "community_status").single(),
        supabase.from("community_likes").select("id"),
        supabase.from("login_sessions").select("*").order("login_time", { ascending: false }),
        supabase.from("visitors").select("*").order("visit_time", { ascending: false }),
        supabase.from("signups").select("*").order("signup_time", { ascending: false }),
      ]);

      const errors = [postsRes.error, commentsRes.error, reportsRes.error, bannedRes.error].filter(Boolean);
      if (errors.length > 0) {
        console.error("Admin data fetch errors:", errors);
        setDataError("Some data failed to load. You may not have full admin access.");
      }

      const todayStart = getTodayStart();

      if (postsRes.data) setPosts(postsRes.data);
      if (commentsRes.data) setComments(commentsRes.data);
      if (reportsRes.data) setReports(reportsRes.data);
      if (bannedRes.data) setBannedUsers(bannedRes.data);
      if (settingsRes.data) setCommunityStatus(settingsRes.data.value);
      if (likesRes.data) setTotalLikes(likesRes.data.length);
      if (loginsRes.data) {
        setLoginSessions(loginsRes.data as LoginSession[]);
        setLoginsToday(loginsRes.data.filter((l: any) => new Date(l.login_time) >= todayStart).length);
      }
      if (visitorsRes.data) {
        setVisitors(visitorsRes.data as Visitor[]);
        setVisitorsToday(visitorsRes.data.filter((v: any) => new Date(v.visit_time) >= todayStart).length);
      }
      if (signupsRes.data) {
        setSignups(signupsRes.data as Signup[]);
        setSignupsToday(signupsRes.data.filter((s: any) => new Date(s.signup_time) >= todayStart).length);
      }
    } catch (err) {
      console.error("Admin data fetch exception:", err);
      setDataError("Failed to load admin data. Please try again.");
    } finally {
      setDataLoading(false);
    }
  }, []);

  const deletePost = async (id: string) => {
    await Promise.all([
      supabase.from("community_comments").delete().eq("post_id", id),
      supabase.from("community_likes").delete().eq("post_id", id),
      supabase.from("community_reactions").delete().eq("post_id", id),
    ]);
    const { error } = await supabase.from("community_posts").delete().eq("id", id);
    if (error) toast.error("Failed to delete post");
    else { setPosts(p => p.filter(x => x.id !== id)); toast.success("Post deleted"); }
  };

  const deleteComment = async (id: string) => {
    const { error } = await supabase.from("community_comments").delete().eq("id", id);
    if (error) toast.error("Failed to delete comment");
    else { setComments(c => c.filter(x => x.id !== id)); toast.success("Comment deleted"); }
  };

  const updateReportStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("reported_content").update({ status }).eq("id", id);
    if (error) toast.error("Failed to update report");
    else { setReports(r => r.map(x => x.id === id ? { ...x, status } : x)); toast.success("Report updated"); }
  };

  const banUser = async (sessionId: string, reason: string) => {
    const session = await supabase.auth.getSession();
    const { error } = await supabase.from("banned_users").insert({
      session_id: sessionId.trim(),
      reason: reason.trim() || null,
      banned_by: session.data.session?.user.id,
    });
    if (error) toast.error("Failed to ban user: " + error.message);
    else { fetchAllData(); toast.success("User banned"); }
    return !error;
  };

  const unbanUser = async (id: string) => {
    const { error } = await supabase.from("banned_users").delete().eq("id", id);
    if (error) toast.error("Failed to unban user");
    else { setBannedUsers(b => b.filter(x => x.id !== id)); toast.success("User unbanned"); }
  };

  const toggleCommunityStatus = async () => {
    const newStatus = communityStatus === "open" ? "closed" : "open";
    const { error } = await supabase
      .from("community_settings")
      .update({ value: newStatus, updated_at: new Date().toISOString() })
      .eq("key", "community_status");
    if (error) toast.error("Failed to update community status");
    else { setCommunityStatus(newStatus); toast.success(`Community ${newStatus === "open" ? "opened" : "closed"}`); }
  };

  return {
    posts, comments, reports, bannedUsers, communityStatus, totalLikes,
    loginSessions, loginsToday,
    visitors, visitorsToday,
    signups, signupsToday,
    dataLoading, dataError,
    fetchAllData, deletePost, deleteComment, updateReportStatus,
    banUser, unbanUser, toggleCommunityStatus,
  };
};

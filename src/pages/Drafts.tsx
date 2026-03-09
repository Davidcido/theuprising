import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDrafts } from "@/hooks/useDrafts";
import { FileText, Trash2, Edit2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuthReady } from "@/hooks/useAuthReady";

const Drafts = () => {
  const { user: authUser } = useAuthReady();
  const userId = authUser?.id;
  const [userName, setUserName] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;
    supabase.from("profiles").select("display_name").eq("user_id", userId).single()
      .then(({ data: profile }) => {
        setUserName(profile?.display_name || authUser?.email?.split("@")[0] || "User");
      });
  }, [userId, authUser]);
  const { drafts, loading, deleteDraft } = useDrafts(userId);

  const publishDraft = async (draft: any) => {
    if (!userId) return;
    const insertData: any = {
      content: draft.content,
      anonymous_name: draft.is_anonymous ? (localStorage.getItem("uprising_session_id") || "User") : userName,
      is_anonymous: draft.is_anonymous,
      media_urls: draft.media_urls || [],
    };
    if (!draft.is_anonymous) insertData.author_id = userId;

    const { error } = await supabase.from("community_posts").insert(insertData);
    if (error) {
      toast.error("Failed to publish draft");
    } else {
      await deleteDraft(draft.id);
      toast.success("Draft published!");
    }
  };

  return (
    <div className="min-h-screen py-12 pb-24">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="w-5 h-5 text-emerald-400" />
          <h1 className="text-2xl font-display font-bold text-foreground">Drafts</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg mb-1">No drafts yet</p>
            <p className="text-sm">Saved drafts from the composer will appear here</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {drafts.map(draft => (
                <motion.div
                  key={draft.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-4 rounded-2xl backdrop-blur-xl border border-white/10"
                  style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-muted-foreground">
                      Last edited {formatDistanceToNow(new Date(draft.updated_at), { addSuffix: true })}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50 bg-white/5 px-2 py-0.5 rounded-full">
                      {draft.is_anonymous ? "Anonymous" : "Named"}
                    </span>
                  </div>
                  <p className="text-foreground/90 text-sm whitespace-pre-wrap break-words mb-3">
                    {draft.content || <span className="italic text-muted-foreground">Empty draft</span>}
                  </p>
                  {draft.media_urls && draft.media_urls.length > 0 && (
                    <p className="text-[10px] text-muted-foreground mb-2">📎 {draft.media_urls.length} media attached</p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="hero" onClick={() => publishDraft(draft)} className="text-xs h-7 rounded-full">
                      <Send className="w-3 h-3 mr-1" /> Publish
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteDraft(draft.id)} className="text-xs h-7 text-red-400 hover:text-red-300">
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default Drafts;

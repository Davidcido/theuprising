import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, Edit2, MapPin, Users, UserPlus, UserMinus, MessageCircle, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useFollow } from "@/hooks/useFollow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES, getCountryFlag } from "@/lib/countries";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useConversations } from "@/hooks/useConversations";

const PRESET_AVATARS = [
  "🌱", "🌿", "🍀", "🌳", "🌻", "🦋", "🐢", "🌊", "⭐", "🔥", "💎", "🎯",
];

const Profile = () => {
  const { userId: paramUserId } = useParams();
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ display_name: "", bio: "", country: "" });
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const targetUserId = paramUserId || currentUserId;
  const isOwnProfile = targetUserId === currentUserId;

  const { profile, loading, updateProfile, uploadAvatar } = useProfile(targetUserId);
  const { isFollowing, followerCount, followingCount, toggleFollow, loading: followLoading } = useFollow(currentUserId, targetUserId);
  const { getOrCreateConversation } = useConversations(currentUserId);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id);
    });
  }, []);

  useEffect(() => {
    if (profile) {
      setEditData({
        display_name: profile.display_name || "",
        bio: profile.bio || "",
        country: profile.country || "",
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!targetUserId) return;
    supabase
      .from("community_posts")
      .select("*")
      .eq("author_id", targetUserId)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setUserPosts(data); });
  }, [targetUserId]);

  const handleSave = async () => {
    const { error } = await updateProfile(editData);
    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated!");
      setEditing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    const { error } = await uploadAvatar(file);
    if (error) toast.error(error);
    else toast.success("Avatar updated!");
    setShowAvatarPicker(false);
  };

  const handlePresetAvatar = async (emoji: string) => {
    await updateProfile({ avatar_url: `emoji:${emoji}` });
    toast.success("Avatar updated!");
    setShowAvatarPicker(false);
  };

  const handleMessage = async () => {
    if (!targetUserId) return;
    const convId = await getOrCreateConversation(targetUserId);
    if (convId) navigate(`/messages/${convId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  const renderAvatar = () => {
    if (profile.avatar_url?.startsWith("emoji:")) {
      return (
        <span className="text-5xl">{profile.avatar_url.replace("emoji:", "")}</span>
      );
    }
    if (profile.avatar_url) {
      return <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />;
    }
    return (
      <span className="text-4xl font-bold text-emerald-400">
        {(profile.display_name || "?")[0]?.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen py-12 pb-24">
      <div className="container mx-auto px-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl backdrop-blur-xl border border-white/15 overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)" }}
        >
          {/* Banner */}
          <div className="h-32 bg-gradient-to-r from-emerald-600/30 to-emerald-800/30" />

          {/* Avatar & Actions */}
          <div className="px-6 -mt-14 relative">
            <div className="flex items-end justify-between">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-emerald-900/50 border-4 border-background flex items-center justify-center overflow-hidden">
                  {renderAvatar()}
                </div>
                {isOwnProfile && (
                  <button
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex gap-2 mb-2">
                {isOwnProfile ? (
                  editing ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-white/60">
                        <X className="w-4 h-4 mr-1" /> Cancel
                      </Button>
                      <Button size="sm" variant="hero" onClick={handleSave}>
                        <Save className="w-4 h-4 mr-1" /> Save
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="text-white/60 hover:text-white">
                      <Edit2 className="w-4 h-4 mr-1" /> Edit Profile
                    </Button>
                  )
                ) : currentUserId ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={handleMessage} className="text-white/60 hover:text-white">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={isFollowing ? "ghost" : "hero"}
                      onClick={toggleFollow}
                      disabled={followLoading}
                      className={isFollowing ? "text-white/60 hover:text-white border border-white/20" : ""}
                    >
                      {isFollowing ? (
                        <><UserMinus className="w-4 h-4 mr-1" /> Unfollow</>
                      ) : (
                        <><UserPlus className="w-4 h-4 mr-1" /> Follow</>
                      )}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            {/* Avatar picker */}
            {showAvatarPicker && isOwnProfile && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-4 rounded-2xl border border-white/15 backdrop-blur-xl"
                style={{ background: "rgba(15, 81, 50, 0.9)" }}
              >
                <p className="text-white/60 text-xs mb-3">Choose a preset avatar or upload your own</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handlePresetAvatar(emoji)}
                      className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-xl transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <Button size="sm" variant="ghost" className="text-white/60" onClick={() => fileInputRef.current?.click()}>
                  <Camera className="w-4 h-4 mr-1" /> Upload Image
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </motion.div>
            )}
          </div>

          {/* Profile Info */}
          <div className="px-6 py-4">
            {editing ? (
              <div className="space-y-3">
                <Input
                  value={editData.display_name}
                  onChange={(e) => setEditData((d) => ({ ...d, display_name: e.target.value }))}
                  placeholder="Display name"
                  className="bg-white/10 border-white/20 text-white"
                />
                <Textarea
                  value={editData.bio}
                  onChange={(e) => setEditData((d) => ({ ...d, bio: e.target.value }))}
                  placeholder="Write a short bio..."
                  rows={3}
                  className="bg-white/10 border-white/20 text-white resize-none"
                  maxLength={300}
                />
                <Select value={editData.country} onValueChange={(v) => setEditData((d) => ({ ...d, country: v }))}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="bg-emerald-900 border-white/20 max-h-60">
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code} className="text-white hover:bg-white/10">
                        {c.flag} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold text-foreground">
                  {profile.display_name || "Anonymous"}
                </h1>
                {profile.country && (
                  <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {getCountryFlag(profile.country)} {COUNTRIES.find((c) => c.code === profile.country)?.name}
                  </p>
                )}
                {profile.bio && (
                  <p className="text-foreground/80 text-sm mt-2">{profile.bio}</p>
                )}
              </>
            )}

            {/* Stats */}
            <div className="flex gap-6 mt-4 text-sm">
              <div className="text-center">
                <span className="font-bold text-foreground">{followerCount}</span>
                <span className="text-muted-foreground ml-1">Followers</span>
              </div>
              <div className="text-center">
                <span className="font-bold text-foreground">{followingCount}</span>
                <span className="text-muted-foreground ml-1">Following</span>
              </div>
              <div className="text-center">
                <span className="font-bold text-foreground">{userPosts.length}</span>
                <span className="text-muted-foreground ml-1">Posts</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* User Posts */}
        <div className="mt-6">
          <h2 className="text-lg font-bold text-foreground mb-3">Posts</h2>
          {userPosts.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No posts yet</p>
          ) : (
            <div className="space-y-3">
              {userPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 rounded-2xl backdrop-blur-xl border border-white/10"
                  style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}
                >
                  <p className="text-foreground/90 text-sm whitespace-pre-wrap break-words">{post.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;

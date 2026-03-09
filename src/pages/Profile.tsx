import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, Edit2, MapPin, UserPlus, UserMinus, MessageCircle, Check, X, ImagePlus, Flag, Ban, Eye, Pin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useFollow } from "@/hooks/useFollow";
import { useBlocks } from "@/hooks/useBlocks";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES, getCountryFlag } from "@/lib/countries";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useConversations } from "@/hooks/useConversations";
import ProfileEmojiPicker from "@/components/profile/ProfileEmojiPicker";
import ProfileCoverPhoto from "@/components/profile/ProfileCoverPhoto";
import { useProfileViews } from "@/hooks/useProfileViews";
import { usePinnedPost } from "@/hooks/usePinnedPost";
import { useAIMemory } from "@/hooks/useAIMemory";
import MemorySettings from "@/components/chat/MemorySettings";

const Profile = () => {
  const { userId: paramUserId } = useParams();
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ display_name: "", bio: "", country: "" });
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const targetUserId = paramUserId || currentUserId;
  const isOwnProfile = targetUserId === currentUserId;

  const { profile, loading, updateProfile, uploadAvatar, uploadCoverPhoto, refetch } = useProfile(targetUserId);
  const { isFollowing, followerCount, followingCount, toggleFollow, loading: followLoading } = useFollow(currentUserId, targetUserId);
  const { getOrCreateConversation } = useConversations(currentUserId);
  const { isBlocked, blockUser, unblockUser } = useBlocks(currentUserId);
  const isTargetBlocked = targetUserId ? isBlocked(targetUserId) : false;
  const { totalViews, weeklyViews, recentViewers } = useProfileViews(targetUserId, currentUserId);
  const { pinnedPostId, fetchPinned, pinPost, unpinPost } = usePinnedPost(currentUserId);
  const { memoryEnabled, memories, setPreference, clearMemories, deleteMemory, disableAndClear } = useAIMemory();

  const handleReport = async () => {
    if (!targetUserId) return;
    const sessionId = localStorage.getItem("uprising_session_id") || "anon";
    await supabase.from("reported_content").insert({
      content_id: targetUserId,
      content_type: "profile",
      reporter_session_id: sessionId,
      reason: "Reported by user",
    });
    toast.success("User reported. Thank you for keeping the community safe.");
  };

  const handleBlock = async () => {
    if (!targetUserId) return;
    if (isTargetBlocked) {
      await unblockUser(targetUserId);
      toast.success("User unblocked");
    } else {
      await blockUser(targetUserId);
      toast.success("User blocked");
    }
  };

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
    fetchPinned();
  }, [targetUserId, fetchPinned]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateProfile(editData);
    setSaving(false);
    if (error) {
      toast.error(typeof error === "string" ? error : "Failed to update profile");
    } else {
      toast.success("Profile updated successfully");
      setEditing(false);
      refetch();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    const { error } = await uploadAvatar(file);
    if (error) toast.error(error);
    else { toast.success("Avatar updated!"); refetch(); }
    setShowAvatarPicker(false);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    const { error } = await uploadCoverPhoto(file);
    if (error) toast.error(error);
    else { toast.success("Cover photo updated!"); refetch(); }
  };

  const handlePresetAvatar = async (emoji: string) => {
    await updateProfile({ avatar_url: `emoji:${emoji}` });
    toast.success("Avatar updated!");
    setShowAvatarPicker(false);
    refetch();
  };

  const handleMessage = async () => {
    if (!targetUserId || !currentUserId) return;
    if (targetUserId === currentUserId) {
      toast.error("You can't message yourself");
      return;
    }
    const convId = await getOrCreateConversation(targetUserId);
    if (convId) {
      navigate(`/messages/${convId}`);
    } else {
      toast.error("Failed to open conversation");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
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

  return (
    <div className="min-h-screen py-12 pb-24">
      <div className="container mx-auto px-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl backdrop-blur-xl border border-white/15 overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)" }}
        >
          {/* Cover Photo */}
          <ProfileCoverPhoto
            coverUrl={profile.cover_photo}
            isOwnProfile={isOwnProfile}
            onUploadClick={() => coverInputRef.current?.click()}
          />
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleCoverUpload}
          />

          {/* Avatar & Actions */}
          <div className="px-6 -mt-14 relative">
            <div className="flex items-end justify-between">
              <div className="relative">
                <UserAvatar
                  avatarUrl={profile.avatar_url}
                  displayName={profile.display_name}
                  size="xl"
                  showStatus
                  onlineStatus={profile.online_status}
                  className="border-4 border-background"
                />
                {isOwnProfile && (
                  <button
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex gap-2 mb-2">
                {isOwnProfile ? (
                  editing ? (
                    <>
                      <Button size="lg" variant="ghost" onClick={() => setEditing(false)} className="text-muted-foreground rounded-xl">
                        <X className="w-4 h-4 mr-1" /> Cancel
                      </Button>
                      <Button size="lg" variant="hero" onClick={handleSave} disabled={saving} className="rounded-xl">
                        <Check className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-4 h-4 mr-1" /> Edit Profile
                    </Button>
                  )
                ) : currentUserId ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={handleMessage} className="text-muted-foreground hover:text-foreground" disabled={isTargetBlocked}>
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={isFollowing ? "ghost" : "hero"}
                      onClick={toggleFollow}
                      disabled={followLoading || isTargetBlocked}
                      className={isFollowing ? "text-muted-foreground hover:text-foreground border border-white/20" : ""}
                    >
                      {isFollowing ? <><UserMinus className="w-4 h-4 mr-1" /> Unfollow</> : <><UserPlus className="w-4 h-4 mr-1" /> Follow</>}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleReport} className="text-yellow-400 hover:text-yellow-300">
                      <Flag className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleBlock} className={isTargetBlocked ? "text-emerald-400 hover:text-emerald-300" : "text-red-400 hover:text-red-300"}>
                      <Ban className="w-4 h-4" />
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            {/* Avatar picker */}
            {showAvatarPicker && isOwnProfile && (
              <ProfileEmojiPicker
                onSelectEmoji={handlePresetAvatar}
                onUploadClick={() => fileInputRef.current?.click()}
              />
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileUpload} />
          </div>

          {/* Profile Info */}
          <div className="px-6 py-4">
            {editing ? (
              <div className="space-y-3">
                <Input
                  value={editData.display_name}
                  onChange={(e) => setEditData((d) => ({ ...d, display_name: e.target.value }))}
                  placeholder="Display name"
                  className="bg-white/10 border-white/20 text-foreground"
                />
                <div>
                  <Textarea
                    value={editData.bio}
                    onChange={(e) => setEditData((d) => ({ ...d, bio: e.target.value.slice(0, 200) }))}
                    placeholder="Write a short bio about yourself..."
                    rows={3}
                    className="bg-white/10 border-white/20 text-foreground resize-none"
                    maxLength={200}
                  />
                  <p className={`text-[11px] mt-1 text-right ${editData.bio.length >= 190 ? "text-destructive" : "text-muted-foreground"}`}>
                    {editData.bio.length}/200
                  </p>
                </div>
                <Select value={editData.country} onValueChange={(v) => setEditData((d) => ({ ...d, country: v }))}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-foreground">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-white/20 max-h-60">
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code} className="text-foreground hover:bg-white/10">
                        {c.flag} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">
                    {profile.display_name || "Anonymous"}
                  </h1>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                    profile.online_status === "online"
                      ? "bg-primary/20 text-primary"
                      : "bg-white/10 text-muted-foreground"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      profile.online_status === "online" ? "bg-primary" : "bg-muted-foreground/50"
                    }`} />
                    {profile.online_status === "online"
                      ? "Online"
                      : profile.last_seen_at
                        ? `Last seen ${formatDistanceToNow(new Date(profile.last_seen_at), { addSuffix: true })}`
                        : "Offline"}
                  </span>
                </div>
                {profile.country && (
                  <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {getCountryFlag(profile.country)} {COUNTRIES.find((c) => c.code === profile.country)?.name}
                  </p>
                )}
                {profile.bio ? (
                  <p className="text-foreground/80 text-sm mt-2">{profile.bio}</p>
                ) : isOwnProfile ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-muted-foreground/60 text-sm mt-2 italic hover:text-muted-foreground transition-colors"
                  >
                    Add a bio so people can know more about you.
                  </button>
                ) : null}
              </>
            )}

            {/* Stats */}
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
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
              <div className="text-center">
                <Eye className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />
                <span className="font-bold text-foreground">{totalViews}</span>
                <span className="text-muted-foreground ml-1">Views</span>
              </div>
            </div>

            {/* Profile views dashboard (owner only) */}
            {isOwnProfile && totalViews > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-muted-foreground mb-1">
                  <Eye className="w-3 h-3 inline mr-1" />
                  {weeklyViews} profile views this week
                </p>
                {recentViewers.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] text-muted-foreground mb-1.5">Recent visitors</p>
                    <div className="flex -space-x-2">
                      {recentViewers.slice(0, 5).map(v => (
                        <UserAvatar
                          key={v.user_id}
                          avatarUrl={v.avatar_url}
                          displayName={v.display_name || "User"}
                          size="xs"
                          className="ring-2 ring-background"
                        />
                      ))}
                      {recentViewers.length > 5 && (
                        <span className="text-[10px] text-muted-foreground ml-2">+{recentViewers.length - 5} more</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* AI Memory Settings (own profile only) */}
        {isOwnProfile && memoryEnabled !== undefined && (
          <div className="mt-6">
            <MemorySettings
              memoryEnabled={memoryEnabled}
              memories={memories}
              onToggle={setPreference}
              onClear={clearMemories}
              onDeleteMemory={deleteMemory}
              onDisableAndClear={disableAndClear}
            />
          </div>
        )}

        {/* User Posts */}
        <div className="mt-6">
          <h2 className="text-lg font-bold text-foreground mb-3">Posts</h2>
          {userPosts.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No posts yet</p>
          ) : (
            <div className="space-y-3">
              {/* Pinned post first */}
              {pinnedPostId && userPosts.find(p => p.id === pinnedPostId) && (
                <div className="relative">
                  <div className="absolute top-2 left-3 z-10 flex items-center gap-1 text-amber-400 text-[10px] font-medium">
                    <Pin className="w-3 h-3" /> Pinned
                  </div>
                  <div
                    className="p-4 pt-7 rounded-2xl backdrop-blur-xl border border-amber-500/20"
                    style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)" }}
                  >
                    <p className="text-foreground/90 text-sm whitespace-pre-wrap break-words">{userPosts.find(p => p.id === pinnedPostId)?.content}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(userPosts.find(p => p.id === pinnedPostId)?.created_at), { addSuffix: true })}
                      </p>
                      {isOwnProfile && (
                        <button onClick={unpinPost} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                          Unpin
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* Other posts */}
              {userPosts.filter(p => p.id !== pinnedPostId).map((post) => (
                <div
                  key={post.id}
                  className="p-4 rounded-2xl backdrop-blur-xl border border-white/10"
                  style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}
                >
                  <p className="text-foreground/90 text-sm whitespace-pre-wrap break-words">{post.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                    {isOwnProfile && post.id !== pinnedPostId && (
                      <button onClick={() => pinPost(post.id)} className="text-[10px] text-muted-foreground hover:text-amber-400 transition-colors flex items-center gap-1">
                        <Pin className="w-3 h-3" /> Pin
                      </button>
                    )}
                  </div>
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

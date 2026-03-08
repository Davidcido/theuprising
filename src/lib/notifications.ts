import { supabase } from "@/integrations/supabase/client";

export const createNotification = async (
  userId: string,
  actorId: string,
  type: string,
  content: string,
  referenceId?: string
) => {
  // Don't notify yourself
  if (userId === actorId) return;

  await supabase.from("notifications").insert({
    user_id: userId,
    actor_id: actorId,
    type,
    content,
    reference_id: referenceId || null,
  });

  // Trigger push notification
  try {
    // Get actor's display name
    const { data: actorProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", actorId)
      .single();

    const actorName = actorProfile?.display_name || "Someone";

    let title = "Uprising";
    let body = content;
    let url = "/";

    switch (type) {
      case "message":
        title = "New message";
        body = `${actorName} sent you a message`;
        url = referenceId ? `/messages/${referenceId}` : "/messages";
        break;
      case "like":
        title = "New like";
        body = `${actorName} liked your post`;
        url = "/community";
        break;
      case "comment":
      case "reply":
        title = "New reply";
        body = `${actorName} replied to your post`;
        url = "/community";
        break;
      case "follow":
        title = "New follower";
        body = `${actorName} started following you`;
        url = `/profile/${actorId}`;
        break;
      default:
        title = "Uprising";
        body = `${actorName} ${content}`;
    }

    await supabase.functions.invoke("send-push", {
      body: { user_id: userId, title, body, url, tag: type },
    });
  } catch (e) {
    // Push notification is best-effort, don't fail the main notification
    console.error("Push notification error:", e);
  }
};

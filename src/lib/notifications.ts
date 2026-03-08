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
};

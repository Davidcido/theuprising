const COMMUNITY_POST_FIELDS = [
  "id",
  "content",
  "anonymous_name",
  "author_id",
  "is_anonymous",
  "likes_count",
  "comments_count",
  "shares_count",
  "views_count",
  "created_at",
  "media_urls",
  "original_post_id",
  "reposted_by_name",
  "engagement_score",
].join(",");

type FeedCursor = {
  createdAt: string;
  id: string;
};

const REQUEST_TIMEOUT_MS = 8000;

/**
 * Reads the public Community feed directly from the project's REST endpoint.
 * This avoids an auth-storage lock delaying a public feed request while the
 * user's session is being restored, while keeping RLS enforcement intact.
 */
export async function fetchCommunityPosts(limit: number, cursor?: FeedCursor | null) {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!baseUrl || !publishableKey) {
    throw new Error("Community data source is not configured");
  }

  const params = new URLSearchParams({
    select: COMMUNITY_POST_FIELDS,
    order: "created_at.desc,id.desc",
    limit: String(limit),
  });

  if (cursor) {
    params.set(
      "or",
      `(created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id}))`,
    );
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/rest/v1/community_posts?${params.toString()}`, {
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Community feed request failed (${response.status})${detail ? `: ${detail}` : ""}`);
    }

    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) {
      throw new Error("Community feed returned an invalid response");
    }

    return rows as Record<string, unknown>[];
  } finally {
    window.clearTimeout(timer);
  }
}
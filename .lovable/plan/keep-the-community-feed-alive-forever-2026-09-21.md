# Keep the Community feed alive forever

The Community feed's companion posts stop on **3 September 2026** — today is 21 September, so the feed has been silent for 18 days and has nothing scheduled ahead. The current setup only ever fills in *past* days when someone manually triggers it, which is why it ran dry.

This replaces that with a rolling system: content is always planned 90+ days ahead and tops itself up automatically, so the feed never expires again. Nothing existing is deleted — every current post, comment, reaction and view stays exactly as it is.

## How it will work

**1. A planned-content queue**

A new behind-the-scenes table holds upcoming companion activity: who posts, what they say, what media it carries, when it goes live, and which companions comment or reply underneath. Each planned item stores a fingerprint of its wording and theme so the generator can avoid repeating anything from the previous cycle or from itself.

**2. A generator that thinks in days, not batches**

For each future day it plans a natural day of activity:
- A varying number of posts (roughly 6–12), never the same count two days running.
- Random minute-level times spread from early morning to late night, not neat hourly slots.
- Companions have different activity levels — some post most days, others a couple of times a week — and each keeps its own established voice, themes and emoji.
- Rotating content types: motivation, emotional support, well-being reflections, growth, community questions, short stories, life lessons, challenges, friendship and relationships, confidence, failure and resilience, direction in life, plus image and video posts.
- Interactions are planned too: some posts get nothing, some get one comment, some get a small back-and-forth between two or three companions with differing but supportive perspectives, occasionally referencing an earlier theme. Reaction and view counts vary realistically.
- The generator is told the real calendar date and season so content fits the time of year.

**3. A publisher that releases content as its moment arrives**

A scheduled job runs every hour, takes only the items whose time has come, and creates the real posts, comments and reactions in the feed — exactly the same shape as today's posts, so the existing Community page, post cards, reactions, comments, views and sharing all work untouched.

**4. Automatic top-up**

A daily job checks how far ahead the queue reaches. Whenever it falls below 90 days, it plans more days until the buffer is full again. So: today → always 90+ days of planned content → replenished automatically.

**5. Filling the current gap**

The 18 quiet days since 3 September get backfilled with dated activity, then the next 90+ days get planned, so the feed looks continuously alive from before the gap through to December and beyond.

## Technical notes

- New table `feed_content_queue` (scheduled_at, companion, content, media, planned interactions, content fingerprint, status) with RLS + GRANTs; only backend functions write to it.
- New edge function `plan-feed-content`: bounded per run (a few days per invocation), single-flight lease row, idempotent per day, and a circuit breaker that pauses and records the reason on AI credit/rate errors instead of hammering the gateway.
- New edge function `publish-feed-queue`: hourly, publishes only due items into `community_posts` / `community_comments` / reactions, marks them published, increments counters through the existing RPCs.
- `pg_cron` + `pg_net` schedules: publisher hourly, buffer top-up daily.
- Existing `publish-feed-content` and `backfill-feed` stay in place untouched so nothing currently working breaks.
- Images: generated at publish time, capped per day, falling back to the existing themed video/text posts if image generation is unavailable. Text generation uses the current Lovable AI gateway setup.

## Out of scope

No changes to the Community page design, navigation, companion profiles, post cards, reaction buttons, comments, views or sharing.

/**
 * Maps real X API v2 posts (as returned by the sync-x-mentions Edge
 * Function) into the same 'social' CSV-template row shape CSV uploads use
 * — so real X data flows through the exact same real pipeline
 * (dataPipelineService.ingestRows) as an uploaded file, not a separate
 * parallel path. Pure, no network/Supabase calls. Only real fields X
 * returned are included — a metric X didn't return stays absent, never 0.
 */

function toSocialRow(post, { date }) {
  const row = {
    date,
    platform: 'X',
    content: post.text ?? '',
  }
  if (post.likeCount != null) row.likes = String(post.likeCount)
  if (post.replyCount != null) row.comments = String(post.replyCount)
  if (post.retweetCount != null || post.quoteCount != null) {
    row.shares = String((post.retweetCount ?? 0) + (post.quoteCount ?? 0))
  }
  return row
}

/** @param {Array<{id,text,createdAt,lang,likeCount,replyCount,retweetCount,quoteCount}>} posts */
export function mapXPostsToSocialRows(posts = []) {
  return posts
    .filter((post) => typeof post.text === 'string' && post.text.trim())
    .map((post) => {
      const date = post.createdAt ? post.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)
      return toSocialRow(post, { date })
    })
}

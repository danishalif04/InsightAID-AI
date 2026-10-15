/**
 * Maps real Threads API posts (as returned by the sync-threads-mentions
 * Edge Function) into the same 'social' CSV-template row shape CSV uploads
 * use — mirrors src/adapters/xMapping.js exactly, so real Threads data
 * flows through the identical real pipeline (dataPipelineService.ingestRows)
 * as an uploaded file or a real X sync, not a separate parallel path.
 *
 * Pure, no network/Supabase calls. Only real fields Threads returned are
 * included — a metric Threads didn't return (or that this token isn't
 * permitted to read) stays absent, never fabricated as 0.
 *
 * `source_post_id` is NOT a canonical 'social' template column — it rides
 * along inside raw_data.payload unmapped (harmless, same as any
 * unrecognized CSV column) purely so threadsAdapter.js can detect posts
 * already synced in a previous run and skip re-inserting them.
 */

function toSocialRow(post, { date, repliesAvailable }) {
  const row = {
    date,
    platform: 'Threads',
    content: post.text ?? '',
    source_post_id: post.id,
  }
  // post.replies is only ever populated when the Edge Function actually
  // confirmed threads_read_replies works for this token — repliesAvailable
  // being false means "permission not confirmed", not "zero replies", so
  // `comments` is omitted entirely in that case rather than reported as 0.
  if (repliesAvailable && Array.isArray(post.replies)) {
    row.comments = String(post.replies.length)
  }
  return row
}

/** @param {Array<{id,text,timestamp,permalink,media_type,is_quote_post,username,replies}>} posts */
export function mapThreadsPostsToSocialRows(posts = [], { repliesAvailable = false } = {}) {
  return posts
    .filter((post) => typeof post.text === 'string' && post.text.trim())
    .map((post) => {
      const date = post.timestamp ? post.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10)
      return toSocialRow(post, { date, repliesAvailable })
    })
}

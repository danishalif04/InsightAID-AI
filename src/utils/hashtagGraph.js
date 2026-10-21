/**
 * Co-occurrence graph + weekly rank from real per-post hashtag arrays
 * (processed_data.features.hashtags — confirmed real data, see
 * docs/redesign/PLAN.md §0.2). A post's own hashtags are de-duplicated
 * before counting (a hashtag repeated twice in one caption shouldn't
 * inflate its own co-occurrence weight with itself or its neighbors).
 */

function uniqueTags(tags) {
  return [...new Set(Array.isArray(tags) ? tags : [])]
}

/**
 * @param {Array<{hashtags:string[], sentimentScore?:number|null}>} posts
 * @param {{minCount?:number}} [options] drop nodes seen fewer than `minCount` times (default 1 — keep everything)
 * @returns {{nodes: Array<{id:string, count:number, avgSentiment:number|null}>, edges: Array<{source:string, target:string, weight:number}>}}
 */
export function buildHashtagGraph(posts = [], options = {}) {
  const minCount = options.minCount ?? 1
  const nodeCounts = new Map()
  const sentimentSums = new Map()
  const sentimentCounts = new Map()
  const edgeCounts = new Map()

  for (const post of posts) {
    const tags = uniqueTags(post.hashtags)
    for (const tag of tags) {
      nodeCounts.set(tag, (nodeCounts.get(tag) ?? 0) + 1)
      if (typeof post.sentimentScore === 'number') {
        sentimentSums.set(tag, (sentimentSums.get(tag) ?? 0) + post.sentimentScore)
        sentimentCounts.set(tag, (sentimentCounts.get(tag) ?? 0) + 1)
      }
    }
    for (let i = 0; i < tags.length; i += 1) {
      for (let j = i + 1; j < tags.length; j += 1) {
        const [a, b] = [tags[i], tags[j]].sort()
        const key = `${a}|${b}`
        edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1)
      }
    }
  }

  const nodes = [...nodeCounts.entries()]
    .filter(([, count]) => count >= minCount)
    .map(([id, count]) => ({
      id,
      count,
      avgSentiment: sentimentCounts.has(id)
        ? Math.round((sentimentSums.get(id) / sentimentCounts.get(id)) * 1000) / 1000
        : null,
    }))

  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges = [...edgeCounts.entries()]
    .map(([key, weight]) => {
      const [source, target] = key.split('|')
      return { source, target, weight }
    })
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))

  return { nodes, edges }
}

/** Monday (ISO week start) of the week `dateString` falls in. */
export function weekStartOf(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`)
  const day = date.getUTCDay() // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day
  date.setUTCDate(date.getUTCDate() + diffToMonday)
  return date.toISOString().slice(0, 10)
}

/**
 * @param {Array<{hashtags:string[], date:string}>} posts `date` is any ISO-parseable date (e.g. collected_at)
 * @param {{topN?:number}} [options]
 * @returns {Array<{week:string, hashtags:Array<{hashtag:string, count:number, rank:number}>}>} sorted ascending by week
 */
export function computeWeeklyHashtagRank(posts = [], options = {}) {
  const topN = options.topN ?? 8
  const byWeek = new Map()

  for (const post of posts) {
    if (!post.date) continue
    const week = weekStartOf(post.date)
    if (!byWeek.has(week)) byWeek.set(week, new Map())
    const counts = byWeek.get(week)
    for (const tag of uniqueTags(post.hashtags)) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }

  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, counts]) => ({
      week,
      hashtags: [...counts.entries()]
        .map(([hashtag, count]) => ({ hashtag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, topN)
        .map((item, index) => ({ ...item, rank: index + 1 })),
    }))
}

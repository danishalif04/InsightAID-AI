/**
 * Root-cause Sankey data (platform -> aspect -> product) and a
 * representative sample of negative posts, both scoped to one crisis
 * episode's date range (src/utils/crisisHistory.js's episode shape).
 * Reuses aspects.js's static keyword lexicon ("Keyword lexicon
 * (heuristic)" wherever surfaced in the UI) — this file only groups/counts
 * what matchAspects already decides, it does not add any classification
 * of its own.
 */

import { matchAspects } from './aspects'

function rowDate(row) {
  const source = row.published_at ?? row.collected_at
  return source ? new Date(source).toISOString().slice(0, 10) : null
}

function rowText(row) {
  return row.cleaned_text ?? row.raw_text ?? ''
}

/** @returns negative-sentiment rows inside [episode.start, episode.end], each tagged with real matched aspects. [] for a null episode or no matches — never guessed. */
export function selectNegativeEpisodeRows(rows = [], episode) {
  if (!episode) return []
  return rows
    .filter((row) => {
      if (row.sentiment !== 'negative') return false
      const date = rowDate(row)
      return date != null && date >= episode.start && date <= episode.end
    })
    .map((row) => ({ ...row, aspects: matchAspects(rowText(row)) }))
}

/**
 * platform -> aspect -> product flow, counted in real post occurrences
 * (a post contributes one platform->aspect link per matched aspect, and
 * one aspect->product link per matched aspect ONLY when that post's
 * `product` field is actually populated — reviews-template rows have one,
 * social-template rows don't, and this must stay visibly true in the
 * returned counts rather than inventing a product).
 *
 * @returns {{nodes:Array<{name:string,category:'platform'|'aspect'|'product'}>, links:Array<{source:number,target:number,value:number}>, totalNegativePosts:number, productAttributedCount:number}|null} null when there's nothing to show for this episode — an honest absence, not an empty chart.
 */
export function buildRootCauseSankey(rows = [], episode) {
  const negativeRows = selectNegativeEpisodeRows(rows, episode)
  if (negativeRows.length === 0) return null

  const nodeIndex = new Map()
  const nodes = []
  const linkCounts = new Map()

  function ensureNode(category, name) {
    const key = `${category}:${name}`
    if (!nodeIndex.has(key)) {
      nodeIndex.set(key, nodes.length)
      nodes.push({ name, category })
    }
    return nodeIndex.get(key)
  }
  function addLink(sourceIndex, targetIndex) {
    const key = `${sourceIndex}->${targetIndex}`
    linkCounts.set(key, (linkCounts.get(key) ?? 0) + 1)
  }

  let productAttributedCount = 0
  for (const row of negativeRows) {
    const platformIndex = ensureNode('platform', row.platform ?? 'unknown')
    const aspects = row.aspects.length > 0 ? row.aspects : ['Unclassified']
    if (row.product) productAttributedCount += 1

    for (const aspect of aspects) {
      const aspectIndex = ensureNode('aspect', aspect)
      addLink(platformIndex, aspectIndex)
      if (row.product) {
        const productIndex = ensureNode('product', row.product)
        addLink(aspectIndex, productIndex)
      }
    }
  }

  const links = [...linkCounts.entries()].map(([key, value]) => {
    const [source, target] = key.split('->').map(Number)
    return { source, target, value }
  })

  return { nodes, links, totalNegativePosts: negativeRows.length, productAttributedCount }
}

/**
 * Representative negative posts for the evidence wall, ranked by real
 * engagement (a measurable signal of visibility — never a random sample
 * dressed up as "representative"). Returns the post's own original text
 * untouched (no translation).
 */
export function selectEvidencePosts(rows = [], episode, limit = 6) {
  return selectNegativeEpisodeRows(rows, episode)
    .sort((a, b) => (b.engagement ?? 0) - (a.engagement ?? 0))
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      platform: row.platform,
      language: row.language,
      date: rowDate(row),
      text: rowText(row),
      aspects: row.aspects,
      engagement: row.engagement ?? null,
    }))
}

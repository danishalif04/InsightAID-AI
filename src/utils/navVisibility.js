/**
 * Which navigation groups a business pathway may see.
 *
 * WATCH THE IDS. They do not read the way you expect, and this is the whole
 * reason this rule lives in one tested place rather than being repeated
 * inline in two components (src/constants/modes.js):
 *
 *   id 'startup'   is labelled "Malaysian Local Shop"
 *   id 'ecommerce' is labelled "Business Startup"
 *
 * So `modes: ['startup']` means "show this only in the Malaysian Local Shop
 * pathway" — NOT "show this in Business Startup". A reader who takes the id
 * at face value and swaps it to 'ecommerce' would move the entire Local Shop
 * workspace onto the one pathway that never uses it, and nothing about the
 * code would look wrong. The tests beside this file assert the labels, not
 * just the ids, so that mistake fails loudly.
 *
 * A group with no `modes` list is pathway-independent and shows everywhere.
 */

/** @param {{modes?: string[]}} group @param {string} mode @returns {boolean} */
export function isGroupVisibleInMode(group, mode) {
  if (!group?.modes) return true
  return group.modes.includes(mode)
}

/** Filters a list of nav groups/sections for one pathway, preserving order. */
export function visibleGroupsForMode(groups, mode) {
  return (groups ?? []).filter((group) => isGroupVisibleInMode(group, mode))
}

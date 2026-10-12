import { supabase } from '@/config/supabaseClient'
import { getReportContext } from './reportContextService'
import { REPORT_BUILDERS } from '@/utils/reportBuilders'

/** Calls Layer 2 (explain-report). Never throws — returns {} on any
 * failure so the caller renders the report's real data with no narrative
 * prose rather than blocking (FYP2.md §55's same reliability rule, applied
 * to reports). */
async function fetchNarratives(reportTitle, sections) {
  const { data, error } = await supabase.functions.invoke('explain-report', {
    body: {
      reportTitle,
      sections: sections.map(({ id, title, actual, scenario, note }) => ({ id, title, actual, scenario, note })),
    },
  })

  if (error || data?.error) return { narratives: {}, unavailable: true }
  return { narratives: data?.narratives ?? {}, unavailable: false }
}

/** @returns {Promise<{report: object, geminiAvailable: boolean}>} */
export async function generateReport(builderKey, mode = 'startup') {
  const builder = REPORT_BUILDERS[builderKey]
  if (!builder) throw new Error(`Unknown report type: ${builderKey}`)

  const context = await getReportContext(mode)
  const report = builder(context)

  const { narratives, unavailable } = await fetchNarratives(report.title, report.sections)
  const sections = report.sections.map((section) => ({ ...section, narrative: narratives[section.id] ?? null }))

  return { report: { ...report, sections }, geminiAvailable: !unavailable }
}

import { supabase } from '@/config/supabaseClient'
import { REPORT_TEMPLATE_DEFINITIONS } from '@/config/reportTemplates'

/** Real per-user last-generated tracking for the 6 report types
 * (supabase/migrations/0001_init.sql's report_templates table). Report
 * content itself is generated on demand by
 * src/services/reportGenerationService.js — this file only tracks "when
 * was each type last generated," not the report body. */
export async function listReportTemplates() {
  const { data, error } = await supabase.from('report_templates').select('name, last_generated')
  if (error) throw error
  const lastGeneratedMap = new Map((data ?? []).map((row) => [row.name, row.last_generated]))

  return REPORT_TEMPLATE_DEFINITIONS.map((template) => ({
    ...template,
    lastGenerated: lastGeneratedMap.get(template.name) ?? null,
  }))
}

/** Upserts-by-name (the table has no unique constraint on name, so this
 * finds-then-updates rather than relying on Supabase's upsert). */
export async function recordGenerated(name, description) {
  const { data: existing, error: findError } = await supabase
    .from('report_templates')
    .select('id')
    .eq('name', name)
    .maybeSingle()
  if (findError) throw findError

  const today = new Date().toISOString().slice(0, 10)
  if (existing) {
    const { error } = await supabase.from('report_templates').update({ last_generated: today }).eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('report_templates').insert({ name, description, last_generated: today })
    if (error) throw error
  }
}

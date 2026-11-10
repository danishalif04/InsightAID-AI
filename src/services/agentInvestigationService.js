import { supabase } from '@/config/supabaseClient'

/**
 * Agent Orchestrator FOUNDATION slice (docs/AUDIT_v3_agentic_direction.md
 * backlog item 5) — wraps the real agent-manager Edge Function and the
 * agent_investigations/agent_tasks/agent_tool_logs tables it writes to.
 * Separate from agentOrchestratorService.js, which is the earlier, even
 * more compact keyword-routing demo this sits alongside.
 */

/** Runs one real investigation. Never returns a raw error object. */
export async function runInvestigation(question) {
  const { data, error } = await supabase.functions.invoke('agent-manager', { body: { question } })

  if (error) throw new Error('Could not reach the agent right now. Please try again in a moment.')
  if (data?.error === 'NOT_CONFIGURED') throw new Error('The AI layer is not set up yet.')
  if (data?.error === 'AUTH_REQUIRED') throw new Error('Please sign in again.')
  if (data?.error) throw new Error(data.message ?? 'The agent had trouble answering that. Please try again in a moment.')
  if (typeof data?.finalAnswer !== 'string' || !data.finalAnswer.trim()) {
    throw new Error('The agent did not return an answer. Please try again.')
  }

  return {
    investigationId: data.investigationId,
    toolCalled: data.toolCalled ?? null,
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    finalAnswer: data.finalAnswer,
  }
}

/** Past investigations for the signed-in user, newest first, each with its tasks and tool logs. */
export async function listInvestigations(limit = 10) {
  const { data: investigations, error } = await supabase
    .from('agent_investigations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  if (!investigations || investigations.length === 0) return []

  const ids = investigations.map((row) => row.id)
  const [{ data: tasks, error: tasksError }, { data: toolLogs, error: toolLogsError }] = await Promise.all([
    supabase.from('agent_tasks').select('*').in('investigation_id', ids).order('step_number', { ascending: true }),
    supabase.from('agent_tool_logs').select('*').in('investigation_id', ids).order('created_at', { ascending: true }),
  ])
  if (tasksError) throw tasksError
  if (toolLogsError) throw toolLogsError

  return investigations.map((investigation) => ({
    ...investigation,
    tasks: (tasks ?? []).filter((task) => task.investigation_id === investigation.id),
    toolLogs: (toolLogs ?? []).filter((log) => log.investigation_id === investigation.id),
  }))
}

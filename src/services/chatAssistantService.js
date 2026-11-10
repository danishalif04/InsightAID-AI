import { supabase } from '@/config/supabaseClient'

/**
 * The floating help chatbot's only Supabase call — same convention as every
 * other *Service.js file (pages/components never call supabase directly).
 * General-app-help scope only (see supabase/functions/chat-assistant):
 * this never sends or receives the user's real business data, just the
 * conversation text itself.
 *
 * @param {Array<{role: 'user'|'assistant', content: string}>} messages
 * @returns {Promise<string>} the assistant's reply text
 * @throws {Error} with a plain-language `.message` the UI can show directly —
 *   NOT_CONFIGURED / UPSTREAM_ERROR / UPSTREAM_MALFORMED / UPSTREAM_UNREACHABLE
 *   are all mapped to a human sentence here, same honesty rule as
 *   recommendationService.js: never show a raw error object to the user.
 */
export async function sendChatMessage(messages) {
  const { data, error } = await supabase.functions.invoke('chat-assistant', { body: { messages } })

  if (error) throw new Error('Could not reach the assistant right now. Please try again in a moment.')

  if (data?.error === 'NOT_CONFIGURED') {
    throw new Error('The AI assistant is not set up yet.')
  }
  if (data?.error) {
    throw new Error('The assistant had trouble answering that. Please try again in a moment.')
  }
  if (typeof data?.reply !== 'string' || !data.reply.trim()) {
    throw new Error('The assistant did not return a reply. Please try again.')
  }

  return data.reply
}

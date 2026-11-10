import { beforeEach, describe, expect, it, vi } from 'vitest'

const { supabase } = vi.hoisted(() => ({
  supabase: { functions: { invoke: vi.fn() } },
}))
vi.mock('@/config/supabaseClient', () => ({ supabase }))

describe('sendChatMessage', () => {
  beforeEach(() => {
    supabase.functions.invoke.mockReset()
  })

  it('returns the reply text on success', async () => {
    const { sendChatMessage } = await import('./chatAssistantService')
    supabase.functions.invoke.mockResolvedValue({ data: { reply: 'Sentiment analysis uses XLM-RoBERTa.' }, error: null })

    const reply = await sendChatMessage([{ role: 'user', content: 'How does sentiment analysis work?' }])

    expect(reply).toBe('Sentiment analysis uses XLM-RoBERTa.')
    expect(supabase.functions.invoke).toHaveBeenCalledWith('chat-assistant', {
      body: { messages: [{ role: 'user', content: 'How does sentiment analysis work?' }] },
    })
  })

  it('throws a plain-language error, never a raw error object, on a network failure', async () => {
    const { sendChatMessage } = await import('./chatAssistantService')
    supabase.functions.invoke.mockResolvedValue({ data: null, error: { message: 'FunctionsHttpError' } })

    await expect(sendChatMessage([{ role: 'user', content: 'hi' }])).rejects.toThrow(
      'Could not reach the assistant right now. Please try again in a moment.'
    )
  })

  it('throws a specific message when the AI provider is not configured', async () => {
    const { sendChatMessage } = await import('./chatAssistantService')
    supabase.functions.invoke.mockResolvedValue({ data: { error: 'NOT_CONFIGURED' }, error: null })

    await expect(sendChatMessage([{ role: 'user', content: 'hi' }])).rejects.toThrow(
      'The AI assistant is not set up yet.'
    )
  })

  it('throws a plain-language error on any other upstream error code', async () => {
    const { sendChatMessage } = await import('./chatAssistantService')
    supabase.functions.invoke.mockResolvedValue({ data: { error: 'UPSTREAM_ERROR', message: 'boom' }, error: null })

    await expect(sendChatMessage([{ role: 'user', content: 'hi' }])).rejects.toThrow(
      'The assistant had trouble answering that. Please try again in a moment.'
    )
  })

  it('throws when the response has no usable reply text', async () => {
    const { sendChatMessage } = await import('./chatAssistantService')
    supabase.functions.invoke.mockResolvedValue({ data: {}, error: null })

    await expect(sendChatMessage([{ role: 'user', content: 'hi' }])).rejects.toThrow(
      'The assistant did not return a reply. Please try again.'
    )
  })
})

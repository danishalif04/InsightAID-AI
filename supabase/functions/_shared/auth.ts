// Shared sign-in check for every AI-calling Edge Function.
//
// The platform's JWT check only proves a request carries *a* valid project
// token, and the public anon key (shipped in every browser bundle) is one.
// So it does not stop a logged-out caller from spending the LLM quota.
//
// This asks Supabase Auth who the token belongs to. The anon key has no user,
// so it fails; only a real signed-in session passes. Returns the user id, or
// null when the caller is not signed in.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function requireUser(req: Request): Promise<string | null> {
  const authorization = req.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anonKey) return null
  const supabase = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return null
  return data.user.id
}

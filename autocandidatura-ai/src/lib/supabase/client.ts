import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createClient(sessionToken?: string) {
  const headers: Record<string, string> = {};
  if (sessionToken) {
    headers['x-session-token'] = sessionToken;
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

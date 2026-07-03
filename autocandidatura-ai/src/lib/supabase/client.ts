import { createBrowserClient } from '@supabase/ssr';

export function createClient(sessionToken?: string) {
  const headers: Record<string, string> = {};
  if (sessionToken) {
    headers['x-session-token'] = sessionToken;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers },
    }
  );
}

import { createClient } from './client';
import { nanoid } from 'nanoid';

export async function createSessionFromClient(email: string, provider: string) {
  const sessionToken = nanoid(32);

  const supabase = createClient(sessionToken);

  // Insert directly — RLS allows INSERT with CHECK (true)
  const { error } = await supabase.from('sessions').insert({
    session_token: sessionToken,
    connected_email: email,
    email_provider: provider,
    consent_accepted: true,
    consent_accepted_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error('Error al conectar: no se pudo crear la sesión.');
  }

  return sessionToken;
}

import { createClient } from './client';
import { nanoid } from 'nanoid';

export async function createSessionFromClient(email: string, provider: string) {
  const sessionToken = nanoid(32);

  const supabase = createClient(sessionToken);

  const { data: existing } = await supabase
    .from('sessions')
    .select('id, session_token')
    .eq('connected_email', email)
    .maybeSingle();

  if (existing) {
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        session_token: sessionToken,
        email_provider: provider,
      })
      .eq('id', existing.id);

    if (updateError) throw new Error('Error al actualizar sesión');
    return sessionToken;
  }

  const { error: insertError } = await supabase.from('sessions').insert({
    session_token: sessionToken,
    connected_email: email,
    email_provider: provider,
    consent_accepted: true,
    consent_accepted_at: new Date().toISOString(),
  });

  if (insertError) throw new Error('Error al crear sesión');
  return sessionToken;
}

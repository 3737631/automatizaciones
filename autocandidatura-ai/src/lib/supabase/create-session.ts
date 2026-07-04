import { nanoid } from 'nanoid';
import { getSupabaseUrl, getAnonKey } from './client';

export async function createSessionFromClient(email: string, provider: string) {
  const sessionToken = nanoid(32);

  const res = await fetch(`${getSupabaseUrl()}/rest/v1/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': getAnonKey(),
      'Authorization': `Bearer ${getAnonKey()}`,
      'x-session-token': sessionToken,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      session_token: sessionToken,
      connected_email: email,
      email_provider: provider,
      consent_accepted: true,
      consent_accepted_at: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error al crear sesión (${res.status}): ${text}`);
  }

  return sessionToken;
}

import { getSupabaseUrl, getAnonKey } from '@/lib/supabase/client';

async function supabaseFetch(path: string, options: RequestInit = {}) {
  const url = `${getSupabaseUrl()}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': getAnonKey(),
      'Authorization': `Bearer ${getAnonKey()}`,
      ...(options.headers || {}),
    },
  });
  return res;
}

export async function uploadCVFromClient(
  file: File,
  sessionToken: string
): Promise<{ success: boolean; error?: string }> {
  if (file.type !== 'application/pdf') {
    return { success: false, error: 'El archivo debe ser un PDF.' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: 'El archivo no puede superar los 10 MB.' };
  }

  try {
    // 1. Look up session by session_token
    const selectRes = await supabaseFetch(
      `/rest/v1/sessions?select=id&session_token=eq.${encodeURIComponent(sessionToken)}&limit=1`,
      {
        headers: {
          'Accept': 'application/json',
          'x-session-token': sessionToken,
        },
      }
    );

    if (!selectRes.ok) {
      return { success: false, error: 'Error al verificar sesión.' };
    }

    const sessions = await selectRes.json();
    if (!sessions || sessions.length === 0) {
      return { success: false, error: 'Sesión no válida. Vuelve a conectar tu correo.' };
    }

    const sessionId: string = sessions[0].id;

    // 2. Upload file to storage
    const arrayBuffer = await file.arrayBuffer();
    const storagePath = `${sessionToken}/${Date.now()}-${file.name}`;

    const uploadRes = await supabaseFetch(
      `/storage/v1/object/cvs/${storagePath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/pdf',
          'x-session-token': sessionToken,
          'x-upsert': 'false',
        },
        body: arrayBuffer,
      }
    );

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      return { success: false, error: `Error al guardar el archivo: ${text}` };
    }

    // 3. Get public URL
    const fileUrl = `${getSupabaseUrl()}/storage/v1/object/public/cvs/${storagePath}`;

    // 4. Insert record in cvs table
    const insertRes = await supabaseFetch(
      `/rest/v1/cvs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          session_id: sessionId,
          file_url: fileUrl,
          file_name: file.name,
          extracted_text: null,
          ai_summary: null,
          detected_skills: null,
          detected_experience: null,
          compatible_roles: null,
          compatible_sectors: null,
        }),
      }
    );

    if (!insertRes.ok) {
      return { success: false, error: 'Error al guardar el CV.' };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error de conexión';
    return { success: false, error: message };
  }
}

import { createClient } from '@/lib/supabase/client';

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
    const supabase = createClient(sessionToken);

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('session_token', sessionToken)
      .single();

    if (sessionError || !session) {
      return { success: false, error: 'Sesión no válida. Vuelve a conectar tu correo.' };
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);
    const storagePath = `${session.id}/${Date.now()}-${file.name}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('cvs')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      if (uploadError.message?.includes('policy')) {
        return { success: false, error: 'Error de permisos. Asegúrate de que el bucket "cvs" existe y el archivo no está duplicado.' };
      }
      return { success: false, error: `Error al guardar el archivo: ${uploadError.message}` };
    }

    const { data: urlData } = supabase.storage.from('cvs').getPublicUrl(uploadData.path);
    const fileUrl = urlData.publicUrl;

    const { error: insertError } = await supabase.from('cvs').insert({
      session_id: session.id,
      file_url: fileUrl,
      file_name: file.name,
      extracted_text: null,
      ai_summary: null,
      detected_skills: null,
      detected_experience: null,
      compatible_roles: null,
      compatible_sectors: null,
    });

    if (insertError) {
      return { success: false, error: 'Error al guardar el CV.' };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error de conexión';
    return { success: false, error: message };
  }
}

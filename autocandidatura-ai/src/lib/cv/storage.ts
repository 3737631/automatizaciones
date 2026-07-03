import { createAdminClient } from '@/lib/supabase/admin';

function getTimestamp(): string {
  return Date.now().toString();
}

export async function uploadCV(
  sessionId: string,
  file: Buffer,
  fileName: string
): Promise<string> {
  const supabase = createAdminClient();
  const timestamp = getTimestamp();
  const storagePath = `${sessionId}/${timestamp}-${fileName}`;

  const { data, error } = await supabase.storage
    .from('cvs')
    .upload(storagePath, file, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (error) {
    throw new Error(`Error al subir el CV a Supabase Storage: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('cvs')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

export async function deleteCV(fileUrl: string): Promise<void> {
  const supabase = createAdminClient();

  // Extract path from URL: everything after /cvs/
  const parts = fileUrl.split('/cvs/');
  if (parts.length < 2) {
    throw new Error('URL de CV no válida');
  }
  const path = parts[1];

  const { error } = await supabase.storage.from('cvs').remove([path]);

  if (error) {
    throw new Error(`Error al eliminar el CV de Storage: ${error.message}`);
  }
}

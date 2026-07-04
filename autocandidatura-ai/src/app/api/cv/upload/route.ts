import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseCVBuffer } from '@/lib/cv/parser';
import { uploadCV } from '@/lib/cv/storage';
import { analyzeCV } from '@/lib/ai/analyze-cv';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.headers.get('x-session-token');
    if (!sessionToken) {
      return NextResponse.json({ error: 'Sesión no encontrada. Vuelve a conectar tu correo.' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('session_token', sessionToken)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Sesión no válida. Vuelve a conectar tu correo.' }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Error al leer el formulario. Envía FormData válido.' }, { status: 400 });
    }

    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo. Selecciona un PDF.' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'El campo "file" debe ser un archivo.' }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'El archivo está vacío.' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'El archivo debe ser un PDF.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'El archivo no puede superar los 5 MB.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let extractedText = '';
    try {
      extractedText = await parseCVBuffer(buffer);
    } catch {
      extractedText = '';
    }

    let analysisResult = {
      summary: '',
      detected_skills: [] as string[],
      detected_experience: '',
      compatible_roles: [] as string[],
      compatible_sectors: [] as string[],
      recommendations: [] as string[],
    };

    if (extractedText.trim().length > 50) {
      try {
        analysisResult = await analyzeCV(extractedText);
      } catch {
        // analysis failed, use defaults
      }
    }

    let fileUrl = '';
    try {
      fileUrl = await uploadCV(session.id, buffer, file.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar el archivo';
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const { error: insertError } = await supabase.from('cvs').insert({
      session_id: session.id,
      file_url: fileUrl,
      file_name: file.name,
      extracted_text: extractedText || null,
      ai_summary: analysisResult.summary || null,
      detected_skills: analysisResult.detected_skills.length > 0 ? analysisResult.detected_skills : null,
      detected_experience: analysisResult.detected_experience || null,
      compatible_roles: analysisResult.compatible_roles.length > 0 ? analysisResult.compatible_roles : null,
      compatible_sectors: analysisResult.compatible_sectors.length > 0 ? analysisResult.compatible_sectors : null,
    });

    if (insertError) {
      return NextResponse.json({ error: 'Error al guardar el análisis.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: analysisResult,
    });
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Método no permitido. Usa POST.' }, { status: 405 });
}

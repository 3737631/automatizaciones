import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseCVBuffer } from '@/lib/cv/parser';
import { uploadCV } from '@/lib/cv/storage';
import { analyzeCV } from '@/lib/ai/analyze-cv';

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

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No se recibió ningún archivo. Selecciona un PDF.' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'El archivo debe ser un PDF.' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo no puede superar los 10 MB.' }, { status: 400 });
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
      return NextResponse.json({ error: 'Error al guardar el archivo. Intenta de nuevo.' }, { status: 500 });
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

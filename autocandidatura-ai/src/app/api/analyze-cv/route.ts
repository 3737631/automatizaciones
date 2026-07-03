import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseCVBuffer } from '@/lib/cv/parser';
import { uploadCV } from '@/lib/cv/storage';
import { analyzeCV } from '@/lib/ai/analyze-cv';

export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.headers.get('x-session-token');

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'x-session-token header requerido' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('session_token', sessionToken)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Sesión no válida' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Archivo PDF requerido' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'El archivo debe ser un PDF' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const extractedText = await parseCVBuffer(buffer);

    const analysisResult = await analyzeCV(extractedText);

    const fileUrl = await uploadCV(session.id, buffer, file.name);

    const { error: insertError } = await supabase.from('cvs').insert({
      session_id: session.id,
      file_url: fileUrl,
      file_name: file.name,
      extracted_text: extractedText,
      ai_summary: analysisResult.summary,
      detected_skills: analysisResult.detected_skills,
      detected_experience: analysisResult.detected_experience,
      compatible_roles: analysisResult.compatible_roles,
      compatible_sectors: analysisResult.compatible_sectors,
    });

    if (insertError) {
      console.error('Error al guardar CV en DB:', insertError.message);
      return NextResponse.json(
        { success: false, error: 'Error al guardar el CV' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: analysisResult,
    });
  } catch (error) {
    console.error('Error en analyze-cv:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseAgentInstruction } from '@/lib/ai/parse-instruction';

export async function POST(req: NextRequest) {
  try {
    const { instruction, session_token } = await req.json();

    if (!instruction || !session_token) {
      return NextResponse.json(
        { success: false, error: 'instruction y session_token son requeridos' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('session_token', session_token)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Sesión no válida' },
        { status: 401 }
      );
    }

    const parsed = await parseAgentInstruction(instruction);

    const { data: instructionRecord, error: insertError } = await supabase
      .from('agent_instructions')
      .insert({
        session_id: session.id,
        raw_instruction: instruction,
        desired_role: parsed.desired_role,
        sector: parsed.sector || null,
        city: parsed.city || null,
        province: parsed.province || null,
        country: parsed.country || null,
        work_mode: parsed.work_mode || null,
        skills: parsed.skills,
        minimum_compatibility_score: parsed.minimum_compatibility_score,
        daily_limit: parsed.daily_limit,
      })
      .select()
      .single();

    if (insertError || !instructionRecord) {
      console.error('Error al guardar instrucción:', insertError?.message);
      return NextResponse.json(
        { success: false, error: 'Error al guardar la instrucción' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: parsed,
      instruction_id: instructionRecord.id,
    });
  } catch (error) {
    console.error('Error en parse-instruction:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { startAgent } from '@/lib/agent/engine';

export async function POST(req: NextRequest) {
  try {
    const { instruction_id, session_token } = await req.json();

    if (!instruction_id || !session_token) {
      return NextResponse.json(
        { success: false, error: 'instruction_id y session_token son requeridos' },
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

    const { data: run, error: runError } = await supabase
      .from('agent_runs')
      .insert({
        session_id: session.id,
        instruction_id,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (runError || !run) {
      console.error('Error al crear AgentRun:', runError?.message);
      return NextResponse.json(
        { success: false, error: 'Error al iniciar el agente' },
        { status: 500 }
      );
    }

    startAgent(session_token, instruction_id).catch((err) => {
      console.error('Error en background agent:', err);
    });

    return NextResponse.json({
      success: true,
      run_id: run.id,
    });
  } catch (error) {
    console.error('Error en agent/start:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

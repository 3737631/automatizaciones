import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AgentRun, AgentStep } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get('runId');

    if (!runId) {
      return NextResponse.json(
        { success: false, error: 'runId query param requerido' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const [runResult, stepsResult] = await Promise.all([
      supabase.from('agent_runs').select('*').eq('id', runId).single(),
      supabase
        .from('agent_steps')
        .select('*')
        .eq('agent_run_id', runId)
        .order('created_at', { ascending: true }),
    ]);

    if (runResult.error || !runResult.data) {
      return NextResponse.json(
        { success: false, error: 'Run no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      status: runResult.data as AgentRun,
      steps: (stepsResult.data || []) as AgentStep[],
    });
  } catch (error) {
    console.error('Error en agent/status:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

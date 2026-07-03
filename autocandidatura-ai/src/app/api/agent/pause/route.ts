import { NextRequest, NextResponse } from 'next/server';
import { pauseAgent } from '@/lib/agent/engine';

export async function POST(req: NextRequest) {
  try {
    const { run_id } = await req.json();

    if (!run_id) {
      return NextResponse.json(
        { success: false, error: 'run_id es requerido' },
        { status: 400 }
      );
    }

    await pauseAgent(run_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en agent/pause:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

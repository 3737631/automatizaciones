import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateSessionToken } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const { email, provider } = await req.json();

    if (!email || !provider) {
      return NextResponse.json(
        { success: false, error: 'email y provider son requeridos' },
        { status: 400 }
      );
    }

    if (provider !== 'gmail' && provider !== 'mock') {
      return NextResponse.json(
        { success: false, error: 'provider debe ser gmail o mock' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const sessionToken = generateSessionToken();

    const { data: existing } = await supabase
      .from('sessions')
      .select('id')
      .eq('connected_email', email)
      .single();

    if (existing) {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          session_token: sessionToken,
          email_provider: provider,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error al actualizar sesión:', updateError.message);
        return NextResponse.json(
          { success: false, error: 'Error al actualizar sesión' },
          { status: 500 }
        );
      }
    } else {
      const { error: insertError } = await supabase
        .from('sessions')
        .insert({
          session_token: sessionToken,
          connected_email: email,
          email_provider: provider,
          consent_accepted: true,
          consent_accepted_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Error al crear sesión:', insertError.message);
        return NextResponse.json(
          { success: false, error: 'Error al crear sesión' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      session_token: sessionToken,
      email,
    });
  } catch (error) {
    console.error('Error en connect-email:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

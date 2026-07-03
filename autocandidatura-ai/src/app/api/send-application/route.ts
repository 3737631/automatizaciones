import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/service';

export async function POST(req: NextRequest) {
  try {
    const { offer_id, subject, message, session_token } = await req.json();

    if (!offer_id || !subject || !message || !session_token) {
      return NextResponse.json(
        {
          success: false,
          error: 'offer_id, subject, message y session_token son requeridos',
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, gmail_access_token_encrypted, gmail_refresh_token_encrypted')
      .eq('session_token', session_token)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Sesión no válida' },
        { status: 401 }
      );
    }

    const { data: offer, error: offerError } = await supabase
      .from('job_offers')
      .select('*')
      .eq('id', offer_id)
      .single();

    if (offerError || !offer) {
      return NextResponse.json(
        { success: false, error: 'Oferta no encontrada' },
        { status: 404 }
      );
    }

    const { data: cvData } = await supabase
      .from('cvs')
      .select('file_url')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const emailResult = await sendEmail({
      to: offer.application_email || '',
      subject,
      message,
      accessToken: session.gmail_access_token_encrypted || undefined,
      refreshToken: session.gmail_refresh_token_encrypted || undefined,
    });

    if (!emailResult.success) {
      await supabase.from('applications').insert({
        session_id: session.id,
        job_offer_id: offer.id,
        company: offer.company,
        application_email: offer.application_email || '',
        subject,
        message,
        cv_url: cvData?.file_url || null,
        status: 'failed',
        error_message: emailResult.error || null,
      });

      await supabase
        .from('job_offers')
        .update({ status: 'error', updated_at: new Date().toISOString() })
        .eq('id', offer.id);

      await supabase.from('application_logs').insert({
        session_id: session.id,
        job_offer_id: offer.id,
        action: 'application_failed',
        details: emailResult.error || 'Error al enviar email',
      });

      return NextResponse.json(
        { success: false, error: emailResult.error || 'Error al enviar email' },
        { status: 500 }
      );
    }

    const { data: application, error: appError } = await supabase
      .from('applications')
      .insert({
        session_id: session.id,
        job_offer_id: offer.id,
        company: offer.company,
        application_email: offer.application_email || '',
        subject,
        message,
        cv_url: cvData?.file_url || null,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (appError) {
      console.error('Error al guardar application:', appError.message);
    }

    await supabase
      .from('job_offers')
      .update({ status: 'applied', updated_at: new Date().toISOString() })
      .eq('id', offer.id);

    await supabase.from('application_logs').insert({
      session_id: session.id,
      job_offer_id: offer.id,
      application_id: application?.id || null,
      action: 'application_sent',
      details: `Candidatura enviada a ${offer.company} para ${offer.title}`,
    });

    return NextResponse.json({
      success: true,
      application_id: application?.id || null,
    });
  } catch (error) {
    console.error('Error en send-application:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateApplicationMessage } from '@/lib/ai/generate-message';
import type { JobOffer } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { offer_id, session_token } = await req.json();

    if (!offer_id || !session_token) {
      return NextResponse.json(
        { success: false, error: 'offer_id y session_token son requeridos' },
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
      .select('ai_summary, detected_skills')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const profile = {
      summary: cvData?.ai_summary || '',
      skills: (cvData?.detected_skills as string[]) || [],
    };

    const offerForAI: JobOffer = {
      id: offer.id,
      session_id: offer.session_id,
      title: offer.title,
      company: offer.company,
      city: offer.city,
      province: offer.province,
      country: offer.country,
      work_mode: offer.work_mode,
      source: offer.source,
      source_url: offer.source_url,
      application_email: offer.application_email,
      application_url: offer.application_url,
      description: offer.description,
      requirements: offer.requirements,
      published_at: offer.published_at,
      compatibility_score: offer.compatibility_score,
      compatibility_reason: offer.compatibility_reason,
      status: offer.status,
      unique_hash: offer.unique_hash,
      created_at: offer.created_at,
      updated_at: offer.updated_at,
    };

    const generated = await generateApplicationMessage(profile, offerForAI);

    return NextResponse.json({
      success: true,
      data: { subject: generated.subject, message: generated.message },
    });
  } catch (error) {
    console.error('Error en generate-message:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

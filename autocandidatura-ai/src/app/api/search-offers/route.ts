import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { searchOffers } from '@/lib/offers/search';
import { validateOfferForAgent } from '@/lib/offers/validator';
import { generateUniqueHash } from '@/lib/utils';
import type { ParsedInstruction, JobOffer } from '@/types';

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

    const { data: instruction, error: instrError } = await supabase
      .from('agent_instructions')
      .select('*')
      .eq('id', instruction_id)
      .single();

    if (instrError || !instruction) {
      return NextResponse.json(
        { success: false, error: 'Instrucción no encontrada' },
        { status: 404 }
      );
    }

    const criteria: ParsedInstruction = {
      desired_role: instruction.desired_role || '',
      sector: instruction.sector || undefined,
      city: instruction.city || undefined,
      province: instruction.province || undefined,
      country: instruction.country || undefined,
      work_mode: instruction.work_mode || undefined,
      skills: instruction.skills || [],
      minimum_compatibility_score: instruction.minimum_compatibility_score ?? 60,
      daily_limit: instruction.daily_limit ?? 10,
    };

    const rawOffers = await searchOffers(criteria);

    const { data: existingOffers } = await supabase
      .from('job_offers')
      .select('unique_hash')
      .eq('session_id', session.id)
      .in('status', ['applied', 'new', 'compatible']);

    const sentHashes = existingOffers
      ? existingOffers.map((o) => o.unique_hash)
      : [];

    const savedOffers: JobOffer[] = [];
    let validCount = 0;

    for (const offer of rawOffers) {
      const hash = offer.unique_hash || generateUniqueHash({
        title: offer.title || '',
        company: offer.company || '',
        description: offer.description,
      });

      const validation = await validateOfferForAgent(
        { ...offer, unique_hash: hash },
        criteria,
        sentHashes
      );

      const status = validation.valid ? 'compatible' : 'incompatible';
      if (validation.valid) validCount++;

      const { data: saved } = await supabase
        .from('job_offers')
        .insert({
          session_id: session.id,
          title: offer.title || '',
          company: offer.company || '',
          city: offer.city || null,
          province: offer.province || null,
          country: offer.country || null,
          work_mode: offer.work_mode || null,
          source: offer.source || 'mock',
          source_url: offer.source_url || null,
          application_email: offer.application_email || null,
          application_url: offer.application_url || null,
          description: offer.description || null,
          requirements: offer.requirements || null,
          published_at: offer.published_at || null,
          status,
          unique_hash: hash,
        })
        .select()
        .single();

      if (saved) {
        savedOffers.push(saved);
      }
    }

    return NextResponse.json({
      success: true,
      offers: savedOffers,
      valid_count: validCount,
      total_count: rawOffers.length,
    });
  } catch (error) {
    console.error('Error en search-offers:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

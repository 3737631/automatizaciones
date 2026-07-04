import { createClient } from '@/lib/supabase/client';
import { searchOffers } from '@/lib/offers/search';
import { validateOfferForAgent } from '@/lib/offers/validator';
import { generateUniqueHash } from '@/lib/utils';
import { sendMockEmail } from '@/lib/gmail/service';
import type {
  AgentRun, AgentStep, ParsedInstruction, CVAnalysisResult, JobOffer, StepStatus,
} from '@/types';

const STEP_NAMES = [
  'Analizando currículum',
  'Interpretando instrucciones',
  'Buscando ofertas',
  'Validando ofertas',
  'Calculando compatibilidad',
  'Generando candidaturas',
  'Enviando candidaturas',
  'Guardando resultados',
];

function parseInstruction(raw: string): ParsedInstruction {
  const lower = raw.toLowerCase();
  const roleMatch = raw.match(/(?:busco|quiero|necesito|encuentra|busca)\s+(?:trabajo\s+)?(?:de\s+|como\s+)?(.+?)(?:en\s+|para|\.|$)/i);
  const cityMatch = raw.match(/(?:en|para)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+?)(?:\s*(?:,\s*|\s+y\s+|\s+remoto|\s+presencial|\s+hibrido|\.|$))/i);
  const modeMatch = raw.match(/\b(remoto|presencial|hibrido|híbrido)\b/i);

  const skills = ['Node.js', 'TypeScript', 'React', 'Python', 'Comunicación', 'Trabajo en equipo'];
  const sectorMatch = raw.match(/(?:sector\s+|de\s+)(.+?)(?:\s+en|\s+para|\.|$)/i);

  return {
    desired_role: roleMatch?.[1]?.trim() || '',
    sector: sectorMatch?.[1]?.trim(),
    city: cityMatch?.[1]?.trim(),
    work_mode: modeMatch?.[1]?.toLowerCase().replace('híbrido', 'hibrido'),
    skills,
    minimum_compatibility_score: 60,
    daily_limit: 10,
  };
}

function generateMessage(
  profile: { summary: string; skills: string[] },
  offer: Partial<JobOffer>,
): { subject: string; message: string } {
  const skillsText = profile.skills.slice(0, 5).join(', ');
  return {
    subject: `Candidatura para ${offer.title} en ${offer.company}`,
    message: `Me presento como candidato para el puesto de ${offer.title} en ${offer.company}.\n\n` +
      `Mi perfil: ${profile.summary || 'Profesional con experiencia en el sector.'}\n\n` +
      `Habilidades: ${skillsText || 'Diversas competencias profesionales.'}\n\n` +
      `Quedo a la espera de su respuesta para ampliar mi información.\n\nAtentamente,\n[Tu nombre]`,
  };
}

interface StepRecord { id: string; step_name: string }

async function updateStep(supabase: ReturnType<typeof createClient>, stepId: string, status: StepStatus, details?: string) {
  await supabase.from('agent_steps').update({ status, details: details || null }).eq('id', stepId);
}

export async function startAgentClient(
  sessionToken: string,
  instructionId: string,
  runId: string,
  onProgress?: (stepName: string, status: StepStatus, details?: string) => void,
) {
  const supabase = createClient();

  const { data: session } = await supabase
    .from('sessions')
    .select('id, session_token, gmail_access_token_encrypted, gmail_refresh_token_encrypted')
    .eq('session_token', sessionToken)
    .single();

  if (!session) return;

  const sessionId = session.id;

  const { data: stepRecords } = await supabase
    .from('agent_steps')
    .select('*')
    .eq('agent_run_id', runId)
    .order('created_at', { ascending: true });

  if (!stepRecords || stepRecords.length === 0) return;

  let totalOffersFound = 0;
  let totalApplicationsSent = 0;
  let totalErrors = 0;
  let cvResult: CVAnalysisResult | undefined;
  let criteria: ParsedInstruction | undefined;

  // Phase 1: Analyze CV
  const step1 = stepRecords[0];
  await updateStep(supabase, step1.id, 'processing');
  onProgress?.(step1.step_name, 'processing');
  try {
    const { data: cvData } = await supabase
      .from('cvs')
      .select('extracted_text, ai_summary, detected_skills, detected_experience, compatible_roles, compatible_sectors')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (cvData?.detected_skills) {
      cvResult = {
        summary: cvData.ai_summary || '',
        detected_skills: cvData.detected_skills || [],
        detected_experience: cvData.detected_experience || '',
        compatible_roles: cvData.compatible_roles || [],
        compatible_sectors: cvData.compatible_sectors || [],
        recommendations: [],
      };
    }
    await updateStep(supabase, step1.id, 'completed', 'CV analizado correctamente');
    onProgress?.(step1.step_name, 'completed', 'CV analizado correctamente');
  } catch {
    totalErrors++;
    await updateStep(supabase, step1.id, 'error', 'Error al analizar CV');
    onProgress?.(step1.step_name, 'error', 'Error al analizar CV');
  }

  // Phase 2: Parse instruction
  const step2 = stepRecords[1];
  await updateStep(supabase, step2.id, 'processing');
  onProgress?.(step2.step_name, 'processing');
  try {
    const { data: instruction } = await supabase
      .from('agent_instructions')
      .select('raw_instruction')
      .eq('id', instructionId)
      .single();

    if (instruction?.raw_instruction) {
      criteria = parseInstruction(instruction.raw_instruction);

      await supabase.from('agent_instructions').update({
        desired_role: criteria.desired_role || null,
        sector: criteria.sector || null,
        city: criteria.city || null,
        work_mode: criteria.work_mode || null,
        skills: criteria.skills,
        minimum_compatibility_score: criteria.minimum_compatibility_score,
        daily_limit: criteria.daily_limit,
      }).eq('id', instructionId);

      await updateStep(supabase, step2.id, 'completed', `Rol: ${criteria.desired_role || 'no especificado'}`);
      onProgress?.(step2.step_name, 'completed', `Rol: ${criteria.desired_role || 'no especificado'}`);
    }
  } catch {
    totalErrors++;
    await updateStep(supabase, step2.id, 'error', 'Error al interpretar instrucción');
    onProgress?.(step2.step_name, 'error');
  }

  if (!criteria) return;

  // Phase 3: Search offers
  const step3 = stepRecords[2];
  let offers: Partial<JobOffer>[] = [];
  await updateStep(supabase, step3.id, 'processing');
  onProgress?.(step3.step_name, 'processing');
  try {
    offers = await searchOffers(criteria);
    totalOffersFound = offers.length;
    await updateStep(supabase, step3.id, 'completed', `Se encontraron ${offers.length} ofertas`);
    onProgress?.(step3.step_name, 'completed', `Se encontraron ${offers.length} ofertas`);
  } catch {
    totalErrors++;
    await updateStep(supabase, step3.id, 'error', 'Error al buscar ofertas');
    onProgress?.(step3.step_name, 'error');
  }

  if (offers.length === 0) {
    await supabase.from('agent_runs').update({
      status: 'completed', finished_at: new Date().toISOString(),
      total_offers_found: 0, total_applications_sent: 0, total_errors,
    }).eq('id', runId);
    return;
  }

  // Phase 4: Validate offers
  const step4 = stepRecords[3];
  const sentHashes: string[] = [];
  const validOffers: Partial<JobOffer>[] = [];

  await updateStep(supabase, step4.id, 'processing');
  onProgress?.(step4.step_name, 'processing');
  try {
    const { data: existingOffers } = await supabase
      .from('job_offers')
      .select('unique_hash')
      .eq('session_id', sessionId);

    if (existingOffers) {
      sentHashes.push(...existingOffers.map((o) => o.unique_hash));
    }

    for (const offer of offers) {
      const result = await validateOfferForAgent(offer, criteria, sentHashes);
      if (result.valid) {
        validOffers.push(offer);
      }
    }

    await updateStep(supabase, step4.id, 'completed', `${validOffers.length} de ${offers.length} ofertas válidas`);
    onProgress?.(step4.step_name, 'completed', `${validOffers.length} de ${offers.length} ofertas válidas`);
  } catch {
    totalErrors++;
    await updateStep(supabase, step4.id, 'error', 'Error al validar ofertas');
    onProgress?.(step4.step_name, 'error');
  }

  if (validOffers.length === 0) {
    await supabase.from('agent_runs').update({
      status: 'completed', finished_at: new Date().toISOString(),
      total_offers_found: totalOffersFound, total_applications_sent: 0, total_errors,
    }).eq('id', runId);
    return;
  }

  // Phase 5: Calculate compatibility
  const step5 = stepRecords[4];
  await updateStep(supabase, step5.id, 'processing');
  onProgress?.(step5.step_name, 'processing');

  const scoredOffers: Array<{ offer: Partial<JobOffer>; score: number; reason: string }> = [];

  for (const offer of validOffers) {
    let score = 50;
    const reasons: string[] = [];

    if (criteria.desired_role && offer.title) {
      const roleWords = criteria.desired_role.toLowerCase().split(' ');
      const titleLower = offer.title.toLowerCase();
      const matchCount = roleWords.filter((w) => titleLower.includes(w)).length;
      if (matchCount > 0) {
        score += Math.min(matchCount * 10, 20);
        reasons.push('Coincide con el rol deseado');
      }
    }

    if (criteria.work_mode && offer.work_mode && offer.work_mode.toLowerCase() === criteria.work_mode.toLowerCase()) {
      score += 10;
      reasons.push('Modalidad coincide');
    }

    if (criteria.city && offer.city && offer.city.toLowerCase().includes(criteria.city.toLowerCase())) {
      score += 10;
      reasons.push('Ubicación coincide');
    }

    scoredOffers.push({
      offer,
      score: Math.max(0, Math.min(100, score)),
      reason: reasons.join('. ') || 'Puntuación base',
    });
  }

  scoredOffers.sort((a, b) => b.score - a.score);
  const compatibleOffers = scoredOffers.filter((s) => s.score >= criteria.minimum_compatibility_score);
  const dailyOffers = compatibleOffers.slice(0, criteria.daily_limit);

  await updateStep(supabase, step5.id, 'completed', `Compatibilidad: ${compatibleOffers.length} ofertas compatibles`);
  onProgress?.(step5.step_name, 'completed', `${compatibleOffers.length} ofertas compatibles`);

  // Phase 6: Generate messages
  const step6 = stepRecords[5];
  const messagesGenerated: Array<{
    offer: Partial<JobOffer>; score: number; reason: string; subject?: string; message?: string;
  }> = [];

  await updateStep(supabase, step6.id, 'processing');
  onProgress?.(step6.step_name, 'processing');
  try {
    for (const item of dailyOffers) {
      if (!item.offer.application_email?.trim()) continue;

      const generated = generateMessage(
        { summary: cvResult?.summary || '', skills: cvResult?.detected_skills || [] },
        item.offer,
      );
      messagesGenerated.push({ ...item, ...generated });
    }
    await updateStep(supabase, step6.id, 'completed', `Mensajes: ${messagesGenerated.length} generados`);
    onProgress?.(step6.step_name, 'completed', `${messagesGenerated.length} mensajes generados`);
  } catch {
    totalErrors++;
    await updateStep(supabase, step6.id, 'error', 'Error al generar mensajes');
    onProgress?.(step6.step_name, 'error');
  }

  // Phase 7: Send applications
  const step7 = stepRecords[6];
  await updateStep(supabase, step7.id, 'processing');
  onProgress?.(step7.step_name, 'processing');

  for (const item of messagesGenerated) {
    if (!item.subject || !item.message) continue;

    try {
      await sendMockEmail(item.offer.application_email!, item.subject, item.message);

      const hash = item.offer.unique_hash || generateUniqueHash({
        title: item.offer.title || '',
        company: item.offer.company || '',
        description: item.offer.description,
      });

      const { data: savedOffer } = await supabase.from('job_offers').insert({
        session_id: sessionId,
        title: item.offer.title || '',
        company: item.offer.company || '',
        city: item.offer.city || null,
        work_mode: item.offer.work_mode || null,
        source: 'mock',
        application_email: item.offer.application_email || null,
        description: item.offer.description || null,
        compatibility_score: item.score,
        compatibility_reason: item.reason,
        status: 'applied',
        unique_hash: hash,
      }).select().single();

      if (savedOffer) {
        await supabase.from('applications').insert({
          session_id: sessionId,
          job_offer_id: savedOffer.id,
          company: item.offer.company || '',
          application_email: item.offer.application_email || '',
          subject: item.subject,
          message: item.message,
          status: 'sent',
          sent_at: new Date().toISOString(),
        });
        totalApplicationsSent++;
      }
    } catch {
      totalErrors++;
    }
  }

  await updateStep(supabase, step7.id, 'completed', `${totalApplicationsSent} candidaturas enviadas`);
  onProgress?.(step7.step_name, 'completed', `${totalApplicationsSent} candidaturas enviadas`);

  // Phase 8: Save results
  const step8 = stepRecords[7];
  await updateStep(supabase, step8.id, 'processing');
  onProgress?.(step8.step_name, 'processing');

  await supabase.from('agent_runs').update({
    status: 'completed',
    finished_at: new Date().toISOString(),
    total_offers_found: totalOffersFound,
    total_applications_sent: totalApplicationsSent,
    total_errors,
  }).eq('id', runId);

  await updateStep(supabase, step8.id, 'completed', `Completado. ${totalApplicationsSent} candidaturas enviadas`);
  onProgress?.(step8.step_name, 'completed', `${totalApplicationsSent} candidaturas enviadas`);
}

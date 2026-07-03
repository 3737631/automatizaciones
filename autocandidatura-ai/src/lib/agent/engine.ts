import { createAdminClient } from '@/lib/supabase/admin';
import { analyzeCV } from '@/lib/ai/analyze-cv';
import { parseAgentInstruction } from '@/lib/ai/parse-instruction';
import { generateApplicationMessage } from '@/lib/ai/generate-message';
import { searchOffers } from '@/lib/offers/search';
import { validateOfferForAgent } from '@/lib/offers/validator';
import { sendEmail } from '@/lib/gmail/service';
import { generateUniqueHash } from '@/lib/utils';
import type {
  AgentRun,
  AgentStep,
  CVAnalysisResult,
  ParsedInstruction,
  JobOffer,
  StepStatus,
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
] as const;

interface SessionData {
  id: string;
  session_token: string;
  gmail_access_token_encrypted: string | null;
  gmail_refresh_token_encrypted: string | null;
}

interface AgentProgress {
  status: string;
  steps: AgentStep[];
  progress: number;
}

async function getSession(supabase: ReturnType<typeof createAdminClient>, sessionToken: string): Promise<SessionData> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, session_token, gmail_access_token_encrypted, gmail_refresh_token_encrypted')
    .eq('session_token', sessionToken)
    .single();

  if (error || !data) {
    throw new Error(`Sesión no encontrada: ${error?.message}`);
  }
  return data;
}

async function logAction(
  supabase: ReturnType<typeof createAdminClient>,
  sessionId: string,
  action: string,
  details: string | null,
  jobOfferId?: string,
  applicationId?: string
) {
  const { error } = await supabase.from('application_logs').insert({
    session_id: sessionId,
    job_offer_id: jobOfferId || null,
    application_id: applicationId || null,
    action,
    details,
  });
  if (error) {
    console.error('Error al guardar log:', error.message);
  }
}

async function updateStep(
  supabase: ReturnType<typeof createAdminClient>,
  stepId: string,
  status: StepStatus,
  details?: string
) {
  const { error } = await supabase
    .from('agent_steps')
    .update({ status, details: details || null })
    .eq('id', stepId);
  if (error) {
    console.error('Error al actualizar step:', error.message);
  }
}

function scoreCompatibility(
  offer: Partial<JobOffer>,
  criteria: ParsedInstruction,
  cvResult?: CVAnalysisResult
): { score: number; reason: string } {
  let score = 50;
  const reasons: string[] = [];

  // Title matching
  if (criteria.desired_role && offer.title) {
    const roleWords = criteria.desired_role.toLowerCase().split(' ');
    const titleLower = offer.title.toLowerCase();
    const matchCount = roleWords.filter((w) => titleLower.includes(w)).length;
    if (matchCount > 0) {
      score += Math.min(matchCount * 10, 20);
      reasons.push(`El título coincide con el rol deseado`);
    }
  }

  // Skills matching
  if (criteria.skills && criteria.skills.length > 0 && offer.description) {
    const descLower = offer.description.toLowerCase();
    const matchedSkills = criteria.skills.filter((s) =>
      descLower.includes(s.toLowerCase())
    );
    const skillScore = Math.round(
      (matchedSkills.length / criteria.skills.length) * 20
    );
    score += skillScore;
    if (matchedSkills.length > 0) {
      reasons.push(`Coinciden ${matchedSkills.length} habilidades`);
    }
  }

  // CV skills match
  if (cvResult?.detected_skills && offer.description) {
    const descLower = offer.description.toLowerCase();
    const matchedCvSkills = cvResult.detected_skills.filter((s) =>
      descLower.includes(s.toLowerCase())
    );
    const cvSkillScore = Math.round(
      (matchedCvSkills.length / Math.max(cvResult.detected_skills.length, 1)) * 10
    );
    score += cvSkillScore;
  }

  // Work mode match
  if (criteria.work_mode && offer.work_mode) {
    if (offer.work_mode.toLowerCase() === criteria.work_mode.toLowerCase()) {
      score += 10;
      reasons.push(`Modalidad de trabajo coincide`);
    } else {
      score -= 10;
      reasons.push(`Modalidad de trabajo no coincide`);
    }
  }

  // City match
  if (criteria.city && offer.city) {
    if (offer.city.toLowerCase().includes(criteria.city.toLowerCase())) {
      score += 10;
      reasons.push(`Ubicación coincide`);
    }
  }

  // Normalize score
  const finalScore = Math.max(0, Math.min(100, score));
  return {
    score: finalScore,
    reason: reasons.join('. ') || 'Puntuación base',
  };
}

export async function startAgent(
  sessionToken: string,
  instructionId: string
): Promise<void> {
  const supabase = createAdminClient();

  // Get session
  let session: SessionData;
  try {
    session = await getSession(supabase, sessionToken);
  } catch (error) {
    throw error;
  }

  // Create AgentRun
  const { data: run, error: runError } = await supabase
    .from('agent_runs')
    .insert({
      session_id: session.id,
      instruction_id: instructionId,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (runError || !run) {
    throw new Error(`Error al crear AgentRun: ${runError?.message}`);
  }

  const runId = run.id;

  // Create steps
  const stepRecords: { id: string; step_name: string }[] = [];
  for (const stepName of STEP_NAMES) {
    const { data: step, error: stepError } = await supabase
      .from('agent_steps')
      .insert({
        agent_run_id: runId,
        step_name: stepName,
        status: 'pending',
      })
      .select()
      .single();

    if (stepError || !step) {
      console.error(`Error al crear step ${stepName}: ${stepError?.message}`);
    } else {
      stepRecords.push({ id: step.id, step_name: step.step_name });
    }
  }

  await logAction(supabase, session.id, 'agent_started', `Agent run ${runId} iniciado`);

  let totalOffersFound = 0;
  let totalApplicationsSent = 0;
  let totalErrors = 0;
  let cvResult: CVAnalysisResult | undefined;
  let criteria: ParsedInstruction | undefined;

  // Phase 1: Analyze CV
  const step1 = stepRecords[0];
  if (step1) {
    try {
      await updateStep(supabase, step1.id, 'processing');
      const { data: cvData } = await supabase
        .from('cvs')
        .select('extracted_text, ai_summary')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (cvData?.extracted_text) {
        cvResult = await analyzeCV(cvData.extracted_text);

        // Update CV with AI analysis
        await supabase
          .from('cvs')
          .update({
            ai_summary: cvResult.summary,
            detected_skills: cvResult.detected_skills,
            detected_experience: cvResult.detected_experience,
            compatible_roles: cvResult.compatible_roles,
            compatible_sectors: cvResult.compatible_sectors,
          })
          .eq('session_id', session.id);

        await updateStep(supabase, step1.id, 'completed', 'CV analizado correctamente');
        await logAction(supabase, session.id, 'cv_analyzed', 'CV analizado por IA');
      } else {
        await updateStep(supabase, step1.id, 'completed', 'No se encontró CV para analizar');
      }
    } catch (error) {
      totalErrors++;
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      await updateStep(supabase, step1.id, 'error', msg);
      await logAction(supabase, session.id, 'cv_analysis_error', msg);
    }
  }

  // Phase 2: Parse instruction
  const step2 = stepRecords[1];
  if (step2) {
    try {
      await updateStep(supabase, step2.id, 'processing');
      const { data: instruction } = await supabase
        .from('agent_instructions')
        .select('raw_instruction')
        .eq('id', instructionId)
        .single();

      if (instruction?.raw_instruction) {
        criteria = await parseAgentInstruction(instruction.raw_instruction);

        // Save parsed fields back to instruction record
        await supabase
          .from('agent_instructions')
          .update({
            desired_role: criteria.desired_role,
            sector: criteria.sector || null,
            city: criteria.city || null,
            province: criteria.province || null,
            country: criteria.country || null,
            work_mode: criteria.work_mode || null,
            skills: criteria.skills,
            minimum_compatibility_score: criteria.minimum_compatibility_score,
            daily_limit: criteria.daily_limit,
          })
          .eq('id', instructionId);

        await updateStep(supabase, step2.id, 'completed', 'Instrucción interpretada correctamente');
        await logAction(supabase, session.id, 'instruction_parsed',
          `Rol: ${criteria.desired_role}, Ciudad: ${criteria.city || 'cualquiera'}`);
      } else {
        throw new Error('Instrucción no encontrada');
      }
    } catch (error) {
      totalErrors++;
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      await updateStep(supabase, step2.id, 'error', msg);
      await logAction(supabase, session.id, 'instruction_parse_error', msg);
    }
  }

  if (!criteria) {
    await updateStep(supabase, runId, 'error', 'No se pudo interpretar la instrucción');
    await supabase.from('agent_runs').update({ status: 'error', finished_at: new Date().toISOString() }).eq('id', runId);
    return;
  }

  // Phase 3: Search offers
  const step3 = stepRecords[2];
  let offers: Partial<JobOffer>[] = [];
  if (step3) {
    try {
      await updateStep(supabase, step3.id, 'processing');
      offers = await searchOffers(criteria);
      totalOffersFound = offers.length;
      await updateStep(supabase, step3.id, 'completed', `Se encontraron ${offers.length} ofertas`);
      await logAction(supabase, session.id, 'offers_found', `${offers.length} ofertas encontradas`);
    } catch (error) {
      totalErrors++;
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      await updateStep(supabase, step3.id, 'error', msg);
      await logAction(supabase, session.id, 'offers_search_error', msg);
    }
  }

  if (offers.length === 0) {
    await supabase.from('agent_runs').update({
      status: 'completed',
      finished_at: new Date().toISOString(),
      total_offers_found: 0,
      total_applications_sent: 0,
      total_errors,
    }).eq('id', runId);
    await logAction(supabase, session.id, 'agent_completed', 'No se encontraron ofertas');
    return;
  }

  // Phase 4: Validate offers
  const step4 = stepRecords[3];
  const sentHashes: string[] = [];
  const validOffers: Partial<JobOffer>[] = [];

  if (step4) {
    try {
      await updateStep(supabase, step4.id, 'processing');
      // Get already sent hashes for this session
      const { data: existingOffers } = await supabase
        .from('job_offers')
        .select('unique_hash')
        .eq('session_id', session.id)
        .in('status', ['applied', 'new', 'compatible']);

      if (existingOffers) {
        sentHashes.push(...existingOffers.map((o) => o.unique_hash));
      }

      for (const offer of offers) {
        const result = await validateOfferForAgent(offer, criteria, sentHashes);
        if (result.valid) {
          validOffers.push(offer);
        } else {
          await logAction(supabase, session.id, 'offer_rejected',
            `Oferta "${offer.title}" rechazada: ${result.reason}`, null, null);
        }
      }

      await updateStep(supabase, step4.id, 'completed',
        `${validOffers.length} de ${offers.length} ofertas válidas`);
    } catch (error) {
      totalErrors++;
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      await updateStep(supabase, step4.id, 'error', msg);
    }
  }

  if (validOffers.length === 0) {
    await supabase.from('agent_runs').update({
      status: 'completed',
      finished_at: new Date().toISOString(),
      total_offers_found: totalOffersFound,
      total_applications_sent: 0,
      total_errors,
    }).eq('id', runId);
    await logAction(supabase, session.id, 'agent_completed', 'No hay ofertas válidas para candidatura');
    return;
  }

  // Phase 5: Calculate compatibility
  const step5 = stepRecords[4];
  const scoredOffers: Array<{ offer: Partial<JobOffer>; score: number; reason: string }> = [];

  if (step5) {
    try {
      await updateStep(supabase, step5.id, 'processing');
      for (const offer of validOffers) {
        const compatibility = scoreCompatibility(offer, criteria, cvResult);
        scoredOffers.push({ offer, ...compatibility });
      }
      // Sort by score descending
      scoredOffers.sort((a, b) => b.score - a.score);
      await updateStep(supabase, step5.id, 'completed',
        `Compatibilidad calculada para ${scoredOffers.length} ofertas`);
    } catch (error) {
      totalErrors++;
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      await updateStep(supabase, step5.id, 'error', msg);
    }
  }

  // Filter by minimum compatibility
  const compatibleOffers = scoredOffers.filter(
    (s) => s.score >= criteria.minimum_compatibility_score
  );

  // Respect daily limit
  const dailyOffers = compatibleOffers.slice(0, criteria.daily_limit);

  // Phase 6: Generate messages (only for offers with valid applicationEmail)
  const step6 = stepRecords[5];
  const messagesGenerated: Array<{
    offer: Partial<JobOffer>;
    score: number;
    reason: string;
    subject?: string;
    message?: string;
  }> = [];

  if (step6) {
    try {
      await updateStep(supabase, step6.id, 'processing');
      for (const item of dailyOffers) {
        const hasEmail =
          item.offer.applicationEmail &&
          item.offer.applicationEmail.trim().length > 0;

        if (!hasEmail) {
          await logAction(supabase, session.id, 'message_skipped',
            `Oferta "${item.offer.title}" no tiene email de contacto`);
          continue;
        }

        try {
          const profile = {
            summary: cvResult?.summary || '',
            skills: cvResult?.detected_skills || [],
          };
          const offerWithFull: JobOffer = {
            id: '',
            session_id: session.id,
            title: item.offer.title || '',
            company: item.offer.company || '',
            city: item.offer.city || null,
            province: item.offer.province || null,
            country: item.offer.country || null,
            work_mode: item.offer.work_mode || null,
            source: item.offer.source || null,
            source_url: item.offer.source_url || null,
            application_email: item.offer.applicationEmail || null,
            application_url: item.offer.applicationUrl || null,
            description: item.offer.description || null,
            requirements: item.offer.requirements || null,
            published_at: item.offer.published_at || null,
            compatibility_score: item.score,
            compatibility_reason: item.reason,
            status: 'compatible',
            unique_hash: item.offer.unique_hash || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const generated = await generateApplicationMessage(profile, offerWithFull);
          messagesGenerated.push({
            ...item,
            subject: generated.subject,
            message: generated.message,
          });
        } catch (error) {
          totalErrors++;
          const msg = error instanceof Error ? error.message : 'Error desconocido';
          await logAction(supabase, session.id, 'message_generation_error',
            `Error al generar mensaje para "${item.offer.title}": ${msg}`);
        }
      }

      await updateStep(supabase, step6.id, 'completed',
        `Mensajes generados para ${messagesGenerated.length} ofertas`);
    } catch (error) {
      totalErrors++;
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      await updateStep(supabase, step6.id, 'error', msg);
    }
  }

  // Phase 7: Send applications
  const step7 = stepRecords[6];
  const sentApplications: Array<{ offer: Partial<JobOffer>; success: boolean }> = [];

  if (step7) {
    try {
      await updateStep(supabase, step7.id, 'processing');
      // Get CV URL
      const { data: cvData } = await supabase
        .from('cvs')
        .select('file_url')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const cvUrl = cvData?.file_url || null;

      for (const item of messagesGenerated) {
        if (!item.subject || !item.message) continue;

        try {
          const emailSent = await sendEmail({
            to: item.offer.applicationEmail!,
            subject: item.subject,
            message: item.message,
            accessToken: session.gmail_access_token_encrypted || undefined,
            refreshToken: session.gmail_refresh_token_encrypted || undefined,
          });

          // Save offer to DB
          const hash = item.offer.unique_hash || generateUniqueHash({
            title: item.offer.title || '',
            company: item.offer.company || '',
            description: item.offer.description,
          });

          const { data: savedOffer } = await supabase
            .from('job_offers')
            .insert({
              session_id: session.id,
              title: item.offer.title || '',
              company: item.offer.company || '',
              city: item.offer.city || null,
              province: item.offer.province || null,
              country: item.offer.country || null,
              work_mode: item.offer.work_mode || null,
              source: item.offer.source || 'mock',
              source_url: item.offer.applicationUrl || null,
              application_email: item.offer.applicationEmail || null,
              application_url: item.offer.applicationUrl || null,
              description: item.offer.description || null,
              requirements: item.offer.requirements || null,
              published_at: item.offer.published_at || null,
              compatibility_score: item.score,
              compatibility_reason: item.reason,
              status: 'applied',
              unique_hash: hash,
            })
            .select()
            .single();

          // Save application record
          if (savedOffer) {
            await supabase.from('applications').insert({
              session_id: session.id,
              job_offer_id: savedOffer.id,
              company: item.offer.company || '',
              application_email: item.offer.applicationEmail || '',
              subject: item.subject,
              message: item.message,
              cv_url: cvUrl,
              status: 'sent',
              sent_at: new Date().toISOString(),
            });

            await logAction(
              supabase,
              session.id,
              'application_sent',
              `Candidatura enviada a ${item.offer.company} para ${item.offer.title}`,
              savedOffer.id
            );

            totalApplicationsSent++;
            sentApplications.push({ offer: item.offer, success: true });
          }
        } catch (error) {
          totalErrors++;
          const msg = error instanceof Error ? error.message : 'Error desconocido';
          await logAction(supabase, session.id, 'application_error',
            `Error al enviar candidatura a "${item.offer.company}": ${msg}`);
          sentApplications.push({ offer: item.offer, success: false });
        }
      }

      await updateStep(supabase, step7.id, 'completed',
        `${totalApplicationsSent} candidaturas enviadas`);
    } catch (error) {
      totalErrors++;
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      await updateStep(supabase, step7.id, 'error', msg);
    }
  }

  // Phase 8: Save results
  const step8 = stepRecords[7];
  if (step8) {
    try {
      await updateStep(supabase, step8.id, 'processing');
      await supabase
        .from('agent_runs')
        .update({
          status: 'completed',
          finished_at: new Date().toISOString(),
          total_offers_found: totalOffersFound,
          total_applications_sent: totalApplicationsSent,
          total_errors,
        })
        .eq('id', runId);

      await updateStep(supabase, step8.id, 'completed',
        `Proceso completado. ${totalApplicationsSent} candidaturas enviadas, ${totalErrors} errores`);
      await logAction(supabase, session.id, 'agent_completed',
        `Agent finalizado. Encontradas: ${totalOffersFound}, Enviadas: ${totalApplicationsSent}, Errores: ${totalErrors}`);
    } catch (error) {
      totalErrors++;
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      await updateStep(supabase, step8.id, 'error', msg);
    }
  }
}

export async function pauseAgent(runId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('agent_runs')
    .update({ status: 'paused' })
    .eq('id', runId);

  if (error) {
    throw new Error(`Error al pausar agent: ${error.message}`);
  }
}

export async function resumeAgent(runId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('agent_runs')
    .update({ status: 'running' })
    .eq('id', runId);

  if (error) {
    throw new Error(`Error al reanudar agent: ${error.message}`);
  }
}

export async function stopAgent(runId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('agent_runs')
    .update({
      status: 'stopped',
      finished_at: new Date().toISOString(),
    })
    .eq('id', runId);

  if (error) {
    throw new Error(`Error al detener agent: ${error.message}`);
  }
}

export async function getAgentStatus(
  runId: string
): Promise<AgentProgress> {
  const supabase = createAdminClient();

  const [runResult, stepsResult] = await Promise.all([
    supabase.from('agent_runs').select('status').eq('id', runId).single(),
    supabase
      .from('agent_steps')
      .select('*')
      .eq('agent_run_id', runId)
      .order('created_at', { ascending: true }),
  ]);

  if (runResult.error || !runResult.data) {
    throw new Error(`Run no encontrado: ${runResult.error?.message}`);
  }

  const steps = stepsResult.data || [];
  const completedSteps = steps.filter((s) => s.status === 'completed').length;
  const totalSteps = STEP_NAMES.length;
  const progress = Math.round((completedSteps / totalSteps) * 100);

  return {
    status: runResult.data.status,
    steps,
    progress,
  };
}

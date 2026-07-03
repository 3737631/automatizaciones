import { callAI } from './client';
import type { JobOffer, GeneratedMessage } from '@/types';

export async function generateApplicationMessage(
  profile: { summary: string; skills: string[] },
  offer: JobOffer
): Promise<GeneratedMessage> {
  const systemPrompt =
    'Eres un asistente que redacta candidaturas profesionales en español. Responde ÚNICAMENTE con JSON válido, sin markdown, sin explicaciones.';

  const prompt = `Genera un mensaje de candidatura personalizado para esta oferta de empleo. Sé profesional, breve y específico. NO inventes experiencia que no tenga el candidato. NO uses frases genéricas o spam.

Perfil del candidato:
- Resumen: ${profile.summary}
- Habilidades: ${profile.skills.join(', ')}

Oferta:
- Puesto: ${offer.title}
- Empresa: ${offer.company}
- Descripción: ${offer.description || 'No disponible'}

Devuelve un objeto JSON con esta estructura:
{
  "subject": "Asunto del correo (profesional y conciso)",
  "message": "Cuerpo del mensaje (2-3 párrafos, tono profesional, menciona por qué encaja el candidato)"
}`;

  try {
    const raw = await callAI(prompt, systemPrompt);
    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    const parsed: GeneratedMessage = JSON.parse(cleaned);

    if (!parsed.subject || !parsed.message) {
      throw new Error('El JSON devuelto no tiene subject o message');
    }

    return parsed;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido';
    throw new Error(`Error al generar mensaje: ${message}`);
  }
}

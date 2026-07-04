import { callAI } from './client';
import type { ParsedInstruction } from '@/types';

export async function parseAgentInstruction(
  rawInstruction: string
): Promise<ParsedInstruction> {
  const systemPrompt =
    'Eres un asistente que extrae criterios de búsqueda de empleo a partir de lenguaje natural. Responde ÚNICAMENTE con JSON válido, sin markdown, sin explicaciones.';

  const prompt = `Extrae los criterios de búsqueda de la siguiente instrucción. Devuelve un objeto JSON con esta estructura EXACTA:
{
  "desired_role": "puesto deseado",
  "sector": "sector (opcional, string vacío si no se especifica)",
  "city": "ciudad (opcional, string vacío si no se especifica)",
  "province": "provincia (opcional, string vacío si no se especifica)",
  "country": "país (opcional, string vacío si no se especifica)",
  "work_mode": "presencial | remoto | hibrido (opcional, string vacío si no se especifica)",
  "skills": ["skill1", "skill2"],
  "minimum_compatibility_score": 30,
  "daily_limit": 10
}

Instrucción:
${rawInstruction}`;

  try {
    const raw = await callAI(prompt, systemPrompt);
    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    const parsed: Partial<ParsedInstruction> = JSON.parse(cleaned);

    return {
      desired_role: parsed.desired_role || '',
      sector: parsed.sector || undefined,
      city: parsed.city || undefined,
      province: parsed.province || undefined,
      country: parsed.country || undefined,
      work_mode: parsed.work_mode || undefined,
      skills: parsed.skills || [],
      minimum_compatibility_score:
        typeof parsed.minimum_compatibility_score === 'number'
          ? Math.min(parsed.minimum_compatibility_score, 50)
          : 30,
      daily_limit:
        typeof parsed.daily_limit === 'number' ? parsed.daily_limit : 10,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido';
    throw new Error(`Error al parsear la instrucción: ${message}`);
  }
}

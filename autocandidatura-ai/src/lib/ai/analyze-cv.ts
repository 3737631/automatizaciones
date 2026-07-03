import { callAI } from './client';
import type { CVAnalysisResult } from '@/types';

export async function analyzeCV(cvText: string): Promise<CVAnalysisResult> {
  const systemPrompt =
    'Eres un asistente experto en análisis de currículums. Responde ÚNICAMENTE con JSON válido, sin markdown, sin explicaciones.';

  const prompt = `Analiza el siguiente currículum y extrae la información estructurada. Devuelve un objeto JSON con esta estructura EXACTA:
{
  "summary": "resumen breve del perfil del candidato",
  "detected_skills": ["habilidad1", "habilidad2"],
  "detected_experience": "descripción de la experiencia laboral detectada",
  "compatible_roles": ["rol1", "rol2"],
  "compatible_sectors": ["sector1", "sector2"],
  "recommendations": ["recomendación1", "recomendación2"]
}

Currículum:
${cvText}`;

  try {
    const raw = await callAI(prompt, systemPrompt);
    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    const parsed: CVAnalysisResult = JSON.parse(cleaned);

    if (!parsed.summary || !Array.isArray(parsed.detected_skills)) {
      throw new Error('El JSON devuelto no tiene la estructura esperada');
    }

    return parsed;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error desconocido';
    throw new Error(`Error al analizar el CV: ${message}`);
  }
}

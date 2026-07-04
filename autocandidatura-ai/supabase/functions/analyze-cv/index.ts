import "@supabase/functions-js/edge-runtime.d.ts"
import { withSupabase } from "@supabase/server"

function extractTextFromPDF(buffer: Uint8Array): string {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer)
  const lines: string[] = []
  const streamMatch = text.match(/stream\s(.+?)\sendstream/s)
  if (streamMatch) {
    lines.push(streamMatch[1])
  }
  const textMatch = text.match(/\(([^)]*)\)/g)
  if (textMatch) {
    lines.push(...textMatch.map((m) => m.slice(1, -1)))
  }
  const btMatches = text.match(/BT\s*(.+?)\s*ET/gs)
  if (btMatches) {
    for (const bt of btMatches) {
      const parts = bt.match(/\(([^)]*)\)/g)
      if (parts) lines.push(...parts.map((m) => m.slice(1, -1)))
      const tjs = bt.match(/Tj\s*\(([^)]*)\)/g)
      if (tjs) lines.push(...tjs.map((m) => m.replace(/Tj\s*\(/, "").replace(/\)$/, "")))
    }
  }
  return lines.filter((l) => l.length > 1).join("\n")
}

async function analyzeWithGemini(text: string): Promise<{
  summary: string
  detected_skills: string[]
  detected_experience: string
  compatible_roles: string[]
  compatible_sectors: string[]
  recommendations: string[]
}> {
  const apiKey = Deno.env.get("GEMINI_API_KEY")
  if (!apiKey) throw new Error("GEMINI_API_KEY not set")

  const prompt = `Eres un experto en análisis de currículums.
Analiza el siguiente texto extraído de un CV y devuelve ÚNICAMENTE un JSON con esta estructura:
{
  "summary": "resumen breve del perfil profesional (2-3 frases)",
  "detected_skills": ["habilidad1", "habilidad2", ...],
  "detected_experience": "descripción de la experiencia relevante",
  "compatible_roles": ["rol compatible 1", "rol compatible 2", ...],
  "compatible_sectors": ["sector1", "sector2", ...],
  "recommendations": ["recomendación 1", ...]
}

TEXTO DEL CV:
${text.slice(0, 15000)}`

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 800 },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error("Gemini error: " + err)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
  const cleaned = text.replace(/```json\s*/i, "").replace(/```/g, "").trim()

  const parsed = JSON.parse(cleaned)
  return {
    summary: parsed.summary || "",
    detected_skills: parsed.detected_skills || [],
    detected_experience: parsed.detected_experience || "",
    compatible_roles: parsed.compatible_roles || [],
    compatible_sectors: parsed.compatible_sectors || [],
    recommendations: parsed.recommendations || [],
  }
}

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req) => {
    const { pdf_base64 } = await req.json() as { pdf_base64: string }

    const binaryStr = atob(pdf_base64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)

    const extractedText = extractTextFromPDF(bytes)

    if (extractedText.length < 20) {
      return Response.json({
        error: "No se pudo extraer texto del PDF",
        extracted_text: extractedText,
        summary: "No se pudo analizar el CV automáticamente.",
        detected_skills: [],
        detected_experience: "",
        compatible_roles: [],
        compatible_sectors: [],
        recommendations: ["Asegúrate de que el PDF contenga texto seleccionable (no escaneado)"],
      })
    }

    try {
      const result = await analyzeWithGemini(extractedText)
      return Response.json({ extracted_text: extractedText, ...result })
    } catch (err) {
      return Response.json({
        error: err instanceof Error ? err.message : "Error de análisis",
        extracted_text: extractedText,
        summary: "Análisis automático no disponible. CV subido correctamente.",
        detected_skills: ["CV subido"],
        detected_experience: "",
        compatible_roles: [],
        compatible_sectors: [],
        recommendations: ["El análisis con IA no está disponible. Puedes continuar con el agente."],
      })
    }
  }),
}

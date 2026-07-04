import "@supabase/functions-js/edge-runtime.d.ts"
import { withSupabase } from "@supabase/server"

interface GenerateInput {
  cv_summary: string
  cv_skills: string[]
  cv_experience: string
  offer_title: string
  offer_company: string
  offer_description: string | null
}

async function generateWithGemini(input: GenerateInput): Promise<{ subject: string; message: string } | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY")
  if (!apiKey) return null

  const prompt = `Eres un asistente experto en redacción de candidaturas laborales.
Genera un email de presentación para el puesto de "${input.offer_title}" en "${input.offer_company}".

Perfil del candidato:
- Resumen: ${input.cv_summary || "Profesional con experiencia"}
- Habilidades: ${input.cv_skills.join(", ")}
- Experiencia: ${input.cv_experience || "No especificada"}

Descripción de la oferta:
${input.offer_description || "No disponible"}

Responde ÚNICAMENTE con un JSON con dos campos: "subject" (asunto, máx 80 caracteres) y "message" (cuerpo del email, 2-4 párrafos, en español formal).`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
      }),
    },
  )

  if (!res.ok) return null

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ""

  try {
    const cleaned = text.replace(/```json\s*/i, "").replace(/```/g, "").trim()
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

function generateTemplate(input: GenerateInput): { subject: string; message: string } {
  const skillsText = input.cv_skills.slice(0, 5).join(", ")
  return {
    subject: `Candidatura para ${input.offer_title} en ${input.offer_company}`,
    message: `Me presento como candidato para el puesto de ${input.offer_title} en ${input.offer_company}.

${input.cv_summary ? `Mi perfil: ${input.cv_summary}\n` : ""}${input.cv_experience ? `Experiencia: ${input.cv_experience}\n` : ""}${skillsText ? `Habilidades destacadas: ${skillsText}\n` : ""}
Quedo a la espera de su respuesta para ampliar mi información.

Atentamente,
[Tu nombre]`,
  }
}

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req) => {
    const input = await req.json() as GenerateInput

    let result = await generateWithGemini(input)
    if (!result) {
      result = generateTemplate(input)
    }

    return Response.json(result)
  }),
}

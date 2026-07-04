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

async function generateWithOpenRouter(input: GenerateInput): Promise<{ subject: string; message: string } | null> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY")
  if (!apiKey) return null

  const systemPrompt = "Eres un asistente experto en redacción de candidaturas laborales. Responde ÚNICAMENTE con JSON: {\"subject\":\"asunto\",\"message\":\"cuerpo\"}"
  const userPrompt = `Genera un email para el puesto "${input.offer_title}" en "${input.offer_company}".
Perfil: ${input.cv_summary || "Profesional con experiencia"}
Habilidades: ${input.cv_skills.join(", ")}
Experiencia: ${input.cv_experience || "No especificada"}
Descripción oferta: ${input.offer_description || "No disponible"}`

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  })

  if (!res.ok) return null

  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content || ""

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
    message: `Me presento como candidato para el puesto de ${input.offer_title} en ${input.offer_company}.\n\n${input.cv_summary ? `Mi perfil: ${input.cv_summary}\n` : ""}${input.cv_experience ? `Experiencia: ${input.cv_experience}\n` : ""}${skillsText ? `Habilidades destacadas: ${skillsText}\n` : ""}\nQuedo a la espera de su respuesta.\n\nAtentamente,\n[Tu nombre]`,
  }
}

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req) => {
    const input = await req.json() as GenerateInput
    const result = await generateWithOpenRouter(input) || generateTemplate(input)
    return Response.json(result)
  }),
}

import "@supabase/functions-js/edge-runtime.d.ts"
import { withSupabase } from "@supabase/server"

function extractTextFromPDF(buffer: Uint8Array): string {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer)
  const lines: string[] = []
  const btMatches = text.match(/BT\s*(.+?)\s*ET/gs)
  if (btMatches) {
    for (const bt of btMatches) {
      const parts = bt.match(/\(([^)]*)\)/g)
      if (parts) lines.push(...parts.map((m) => m.slice(1, -1)))
    }
  }
  const textMatches = text.match(/\(([^)]*)\)/g)
  if (textMatches) lines.push(...textMatches.map((m) => m.slice(1, -1)))
  return lines.filter((l) => l.length > 2).join("\n")
}

async function analyzeWithOpenRouter(text: string): Promise<{
  summary: string
  detected_skills: string[]
  detected_experience: string
  compatible_roles: string[]
  compatible_sectors: string[]
  recommendations: string[]
}> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY")
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set")

  const systemPrompt = "Eres un experto en análisis de currículums. Responde ÚNICAMENTE con JSON: {\"summary\":\"...\",\"detected_skills\":[\"...\"],\"detected_experience\":\"...\",\"compatible_roles\":[\"...\"],\"compatible_sectors\":[\"...\"],\"recommendations\":[\"...\"]}"
  const userPrompt = `Analiza este CV:\n\n${text.slice(0, 15000)}`

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
      temperature: 0.2,
      max_tokens: 800,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error("OpenRouter error: " + err)
  }

  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content || ""
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
        detected_skills: [],
        summary: "No se pudo analizar el CV automáticamente.",
        detected_experience: "",
        compatible_roles: [],
        compatible_sectors: [],
        recommendations: ["Asegúrate de que el PDF contenga texto seleccionable (no escaneado)"],
      })
    }

    try {
      const result = await analyzeWithOpenRouter(extractedText)
      return Response.json({ extracted_text: extractedText, ...result })
    } catch (err) {
      return Response.json({
        error: err instanceof Error ? err.message : "Error de análisis",
        detected_skills: ["CV subido"],
        summary: "CV subido correctamente.",
        detected_experience: "",
        compatible_roles: [],
        compatible_sectors: [],
        recommendations: ["El análisis con IA no está disponible temporalmente."],
      })
    }
  }),
}

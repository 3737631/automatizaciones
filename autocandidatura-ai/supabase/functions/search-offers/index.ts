import "@supabase/functions-js/edge-runtime.d.ts"
import { withSupabase } from "@supabase/server"

interface SearchCriteria {
  desired_role?: string
  city?: string
  work_mode?: string
  sector?: string
  skills?: string[]
}

interface JobOffer {
  title: string
  company: string
  city: string | null
  work_mode: string | null
  description: string | null
  application_email: string | null
  url: string | null
  source: string
}

async function searchInfoJobs(criteria: SearchCriteria): Promise<JobOffer[]> {
  const clientId = Deno.env.get("INFOJOBS_CLIENT_ID")
  const clientSecret = Deno.env.get("INFOJOBS_CLIENT_SECRET")
  if (!clientId || !clientSecret) return []

  const query = criteria.desired_role || ""
  const city = criteria.city || ""
  const qParts = [query, city].filter(Boolean)
  const q = qParts.join(" ")

  const res = await fetch(
    `https://api.infojobs.net/api/9/offer?q=${encodeURIComponent(q)}&maxResults=20`,
    { headers: { Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}` } },
  )
  if (!res.ok) return []

  const data = await res.json()
  const offers: JobOffer[] = (data.offers || []).map((o: any) => {
    const mode = o.teleworking?.value?.toLowerCase() || ""
    return {
      title: o.title || "",
      company: o.author?.name || o.profile?.name || "",
      city: o.city || o.multiposting?.city || null,
      work_mode: mode.includes("remoto") ? "remoto" : mode.includes("presencial") ? "presencial" : "hibrido",
      description: o.description || null,
      application_email: null,
      url: o.link || null,
      source: "infojobs",
    }
  })

  return offers
}

async function searchAdzuna(criteria: SearchCriteria): Promise<JobOffer[]> {
  const appId = Deno.env.get("ADZUNA_APP_ID")
  const appKey = Deno.env.get("ADZUNA_APP_KEY")
  if (!appId || !appKey) return []

  const what = criteria.desired_role || ""
  const where = criteria.city || ""
  const country = "es"

  const res = await fetch(
    `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(what)}&where=${encodeURIComponent(where)}&results_per_page=20`,
  )
  if (!res.ok) return []

  const data = await res.json()
  const offers: JobOffer[] = (data.results || []).map((r: any) => ({
    title: r.title || "",
    company: r.company?.display_name || "",
    city: r.location?.display_name?.split(",")?.[0]?.trim() || null,
    work_mode: null,
    description: r.description || null,
    application_email: null,
    url: r.redirect_url || null,
    source: "adzuna",
  }))

  return offers
}

const MOCK_OFFERS: JobOffer[] = [
  { title: "Desarrollador Full Stack", company: "TechCorp Spain", city: "Madrid", work_mode: "hibrido", description: "Buscamos desarrollador full stack con experiencia en React y Node.js para unirse a nuestro equipo.", application_email: "rrhh@techcorp.es", url: null, source: "mock" },
  { title: "Frontend Developer React", company: "DigitalWave", city: "Barcelona", work_mode: "remoto", description: "Únete al equipo de frontend para construir interfaces modernas con React, TypeScript y Tailwind.", application_email: "talento@digitalwave.io", url: null, source: "mock" },
  { title: "Backend Developer Node.js", company: "CloudSys", city: "Valencia", work_mode: "remoto", description: "Desarrollador backend para API REST con Node.js, Express y PostgreSQL.", application_email: "jobs@cloudsys.dev", url: null, source: "mock" },
  { title: "Ingeniero de Software", company: "InnovaTech", city: "Sevilla", work_mode: "presencial", description: "Ingeniero de software para desarrollo de aplicaciones web y móviles.", application_email: "empleo@innovatech.es", url: null, source: "mock" },
  { title: "DevOps Engineer", company: "DataFlow", city: "Madrid", work_mode: "remoto", description: "Buscamos ingeniero DevOps con experiencia en Docker, Kubernetes y CI/CD.", application_email: "hr@dataflow.com", url: null, source: "mock" },
  { title: "React Native Developer", company: "AppStudio", city: "Barcelona", work_mode: "hibrido", description: "Desarrollador de apps móviles con React Native para proyectos internacionales.", application_email: "rrhh@appstudio.cat", url: null, source: "mock" },
  { title: "Data Scientist", company: "AI Labs", city: "Madrid", work_mode: "remoto", description: "Científico de datos para desarrollar modelos de machine learning y análisis predictivo.", application_email: "careers@ailabs.es", url: null, source: "mock" },
  { title: "Project Manager IT", company: "GlobalTech", city: "Barcelona", work_mode: "hibrido", description: "Gestor de proyectos tecnológicos con experiencia en metodologías ágiles.", application_email: "jobs@globaltech.eu", url: null, source: "mock" },
  { title: "Cybersecurity Analyst", company: "SecureNet", city: "Madrid", work_mode: "presencial", description: "Analista de ciberseguridad para proteger infraestructuras críticas.", application_email: "security@securenet.es", url: null, source: "mock" },
  { title: "QA Engineer", company: "TestPro", city: "Valencia", work_mode: "remoto", description: "Ingeniero de calidad para automatización de pruebas con Selenium y Cypress.", application_email: "qa@testpro.io", url: null, source: "mock" },
]

function getMockOffers(criteria: SearchCriteria): JobOffer[] {
  let filtered = [...MOCK_OFFERS]
  if (criteria.desired_role) {
    const words = criteria.desired_role.toLowerCase().split(" ")
    filtered = filtered.filter((o) =>
      words.some((w) => o.title.toLowerCase().includes(w) || o.description?.toLowerCase().includes(w))
    )
  }
  if (criteria.city) {
    const cityLower = criteria.city.toLowerCase()
    filtered = filtered.filter((o) => o.city?.toLowerCase().includes(cityLower))
  }
  if (criteria.work_mode) {
    filtered = filtered.filter((o) => o.work_mode?.toLowerCase() === criteria.work_mode.toLowerCase())
  }
  return filtered.length > 0 ? filtered : MOCK_OFFERS.slice(0, 5)
}

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req) => {
    const { criteria } = await req.json() as { criteria: SearchCriteria }

    const allOffers: JobOffer[] = []

    const [infoJobsOffers, adzunaOffers] = await Promise.all([
      searchInfoJobs(criteria),
      searchAdzuna(criteria),
    ])

    allOffers.push(...infoJobsOffers, ...adzunaOffers)

    if (allOffers.length === 0) {
      allOffers.push(...getMockOffers(criteria))
    }

    const unique = Array.from(new Map(allOffers.map((o) => [o.title + o.company, o])).values())

    return Response.json({ offers: unique, source: infoJobsOffers.length > 0 || adzunaOffers.length > 0 ? "real" : "mock" })
  }),
}

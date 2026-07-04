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
  application_url: string | null
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
      application_url: o.link || null,
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
      application_url: r.redirect_url || null,
      url: r.redirect_url || null,
      source: "adzuna",
  }))

  return offers
}

const MOCK_OFFERS: JobOffer[] = [
  { title: "Médico de Familia", company: "Hospital Clínico", city: "Madrid", work_mode: "presencial", description: "Buscamos médico de familia para consultas externas. Contrato estable, formación continuada y horario flexible.", application_email: "rrhh@hospitalclinico.es", application_url: null, url: null, source: "mock" },
  { title: "Enfermero/a de Urgencias", company: "Sanitas", city: "Barcelona", work_mode: "presencial", description: "Precisamos enfermero/a para servicio de urgencias hospitalarias. Experiencia mínima 2 años.", application_email: "talento@sanitas.es", application_url: null, url: null, source: "mock" },
  { title: "Médico Especialista", company: "Quirón Salud", city: "Madrid", work_mode: "presencial", description: "Incorporamos médico especialista para consultas. Ofrecemos contrato indefinido y desarrollo profesional.", application_email: "empleo@quironsalud.es", application_url: null, url: null, source: "mock" },
  { title: "Pediatra", company: "HM Hospitales", city: "Valencia", work_mode: "presencial", description: "Buscamos pediatra para unidad de pediatría hospitalaria. Jornada completa.", application_email: "hr@hmhospitales.com", application_url: null, url: null, source: "mock" },
  { title: "Cardiólogo", company: "Roche", city: "Barcelona", work_mode: "hibrido", description: "Cardiólogo para investigación clínica y consultas. Colaboración con equipos multidisciplinares.", application_email: "careers@roche.es", application_url: null, url: null, source: "mock" },
  { title: "Abogado Laboralista", company: "Bufete Martínez", city: "Madrid", work_mode: "presencial", description: "Despacho de abogados busca letrado laboralista con experiencia en despidos y negociación colectiva.", application_email: "rrhh@bufetemartinez.es", application_url: null, url: null, source: "mock" },
  { title: "Profesor de Secundaria", company: "Colegio Estudio", city: "Madrid", work_mode: "presencial", description: "Profesor para ESO y Bachillerato. Titulación requerida y experiencia docente.", application_email: "jobs@colegioestudio.es", application_url: null, url: null, source: "mock" },
  { title: "Enfermero/a de Quirófano", company: "Mutua Madrileña", city: "Madrid", work_mode: "presencial", description: "Enfermero/a especializado en quirófano para centro hospitalario en Madrid.", application_email: "rrhh@mutuamadrilena.es", application_url: null, url: null, source: "mock" },
  { title: "Comercial Sector Farmacéutico", company: "Mapfre", city: "Barcelona", work_mode: "hibrido", description: "Comercial con experiencia en visita médica para representar nuestro portfolio.", application_email: "talento@mapfre.com", application_url: null, url: null, source: "mock" },
  { title: "Administrativo Hospitalario", company: "Hospital Clínico", city: "Valencia", work_mode: "presencial", description: "Administrativo para gestión de historias clínicas y admisión de pacientes.", application_email: "rrhh@hospitalclinico.es", application_url: null, url: null, source: "mock" },
  { title: "Médico de Urgencias", company: "Sanitas", city: "Sevilla", work_mode: "presencial", description: "Médico para servicio de urgencias 24h. Contrato con turnos rotativos.", application_email: "empleo@sanitas.es", application_url: null, url: null, source: "mock" },
  { title: "Desarrollador Full Stack", company: "TechCorp Spain", city: "Madrid", work_mode: "hibrido", description: "Buscamos desarrollador full stack con experiencia en React y Node.js.", application_email: "rrhh@techcorp.es", application_url: null, url: null, source: "mock" },
  { title: "Enfermero/a de Atención Primaria", company: "Quirón Salud", city: "Bilbao", work_mode: "presencial", description: "Enfermero/a para centro de atención primaria. Horario de mañanas.", application_email: "rrhh@quironsalud.es", application_url: null, url: null, source: "mock" },
  { title: "Data Scientist", company: "AI Labs", city: "Madrid", work_mode: "remoto", description: "Científico de datos para desarrollar modelos de machine learning.", application_email: "careers@ailabs.es", application_url: null, url: null, source: "mock" },
  { title: "Gerocultor/a", company: "Grupo Hospitalario HM", city: "Málaga", work_mode: "presencial", description: "Auxiliar de geriatría para residencia de mayores. Experiencia y formación en geriatría.", application_email: "rrhh@hmhospitales.com", application_url: null, url: null, source: "mock" },
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
  return filtered.length >= 3 ? filtered : MOCK_OFFERS.slice(0, 5)
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

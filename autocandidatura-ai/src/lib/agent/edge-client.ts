import { createClient } from '@/lib/supabase/client'
import { searchOffers as mockSearchOffers } from '@/lib/offers/search'
import { sendMockEmail } from '@/lib/gmail/service'
import { generateUniqueHash } from '@/lib/utils'
import type { ParsedInstruction, JobOffer } from '@/types'

function getSupabase() {
  if (typeof window === 'undefined') return null
  try { return createClient() } catch { return null }
}

async function invokeWithTimeout(fn: () => Promise<any>, ms = 15000): Promise<any> {
  const result = await Promise.race([
    fn(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
  return result
}



interface EdgeJobOffer {
  title: string
  company: string
  city: string | null
  work_mode: string | null
  description: string | null
  application_email: string | null
  url: string | null
  source: string
}

export async function searchOffersReal(criteria: ParsedInstruction): Promise<Partial<JobOffer>[]> {
  const supabase = getSupabase()
  if (!supabase) return mockSearchOffers(criteria)
  try {
    const { data, error } = await invokeWithTimeout(() =>
      supabase.functions.invoke('search-offers', {
        body: { criteria: { desired_role: criteria.desired_role, city: criteria.city, work_mode: criteria.work_mode, sector: criteria.sector, skills: criteria.skills } },
      })
    )
    if (!error && data?.offers?.length > 0) {
      return data.offers.map((o: EdgeJobOffer) => ({
        id: generateUniqueHash({ title: o.title, company: o.company, description: o.description }),
        title: o.title,
        company: o.company,
        city: o.city,
        work_mode: o.work_mode,
        description: o.description,
        application_email: o.application_email,
        source: o.source as JobOffer['source'],
      }))
    }
  } catch {
    // fall through to mock
  }
  return mockSearchOffers(criteria)
}

interface MessageResult {
  subject: string
  message: string
}

export async function generateMessageReal(
  cvSummary: string,
  cvSkills: string[],
  cvExperience: string,
  offerTitle: string,
  offerCompany: string,
  offerDescription: string | null,
): Promise<MessageResult> {
  const supabase = getSupabase()
  if (!supabase) {
    const skillsText = cvSkills.slice(0, 5).join(', ')
    return {
      subject: `Candidatura para ${offerTitle} en ${offerCompany}`,
      message: `Me presento como candidato para el puesto de ${offerTitle} en ${offerCompany}.\n\n` +
        `Mi perfil: ${cvSummary || 'Profesional con experiencia en el sector.'}\n\n` +
        `Habilidades: ${skillsText || 'Diversas competencias profesionales.'}\n\n` +
        `Quedo a la espera de su respuesta para ampliar mi información.\n\nAtentamente,\n[Tu nombre]`,
    }
  }
  try {
    const { data, error } = await invokeWithTimeout(() =>
      supabase.functions.invoke('generate-message', {
        body: {
          cv_summary: cvSummary,
          cv_skills: cvSkills,
          cv_experience: cvExperience,
          offer_title: offerTitle,
          offer_company: offerCompany,
          offer_description: offerDescription,
        },
      })
    )
    if (!error && data?.subject && data?.message) {
      return { subject: data.subject, message: data.message }
    }
  } catch {
    // fall through to template
  }

  const skillsText = cvSkills.slice(0, 5).join(', ')
  return {
    subject: `Candidatura para ${offerTitle} en ${offerCompany}`,
    message: `Me presento como candidato para el puesto de ${offerTitle} en ${offerCompany}.\n\n` +
      `Mi perfil: ${cvSummary || 'Profesional con experiencia en el sector.'}\n\n` +
      `Habilidades: ${skillsText || 'Diversas competencias profesionales.'}\n\n` +
      `Quedo a la espera de su respuesta para ampliar mi información.\n\nAtentamente,\n[Tu nombre]`,
  }
}

interface SendResult {
  sent: boolean
  error: string | null
  access_token?: string
}

export async function sendApplicationReal(
  to: string,
  subject: string,
  message: string,
  gmailAccessToken: string,
  gmailRefreshToken: string,
): Promise<boolean> {
  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data, error } = await invokeWithTimeout(() =>
        supabase.functions.invoke('send-application', {
          body: { to, subject, message, gmail_access_token: gmailAccessToken, gmail_refresh_token: gmailRefreshToken },
        })
      )
      if (!error && data?.sent) {
        return true
      }
    } catch {
      // fall through to mock
    }
  }
  return sendMockEmail(to, subject, message)
}

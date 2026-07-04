import { searchOffers as mockSearchOffers } from '@/lib/offers/search'
import { sendMockEmail } from '@/lib/gmail/service'
import type { ParsedInstruction, JobOffer } from '@/types'

export async function searchOffersReal(criteria: ParsedInstruction): Promise<Partial<JobOffer>[]> {
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
  const skillsText = cvSkills.slice(0, 5).join(', ')
  return {
    subject: `Candidatura para ${offerTitle} en ${offerCompany}`,
    message: `Me presento como candidato para el puesto de ${offerTitle} en ${offerCompany}.\n\n` +
      `Mi perfil: ${cvSummary || 'Profesional con experiencia en el sector.'}\n\n` +
      `Habilidades: ${skillsText || 'Diversas competencias profesionales.'}\n\n` +
      `Quedo a la espera de su respuesta para ampliar mi información.\n\nAtentamente,\n[Tu nombre]`,
  }
}

export async function sendApplicationReal(
  to: string,
  subject: string,
  message: string,
  gmailAccessToken: string,
  gmailRefreshToken: string,
): Promise<boolean> {
  return sendMockEmail(to, subject, message)
}

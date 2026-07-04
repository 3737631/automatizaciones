import type { ParsedInstruction } from '@/types';

const SPAM_INDICATORS = [
  'gana dinero',
  'trabajo fácil',
  'sin experiencia',
  'multi-level',
  'multinivel',
  'haz clic aquí',
  'invierta',
  'dinero rápido',
  'esquema piramidal',
  'trabajo desde casa sin',
];

export async function validateOfferForAgent(
  offer: Partial<{
    title: string;
    company: string;
    description: string | null;
    application_email: string | null;
    application_url: string | null;
    city: string | null;
    work_mode: string | null;
    unique_hash: string;
  }>,
  criteria: ParsedInstruction,
  sentOfferHashes: string[]
): Promise<{ valid: boolean; reason?: string }> {
  // Check required fields
  if (!offer.title || offer.title.trim().length === 0) {
    return { valid: false, reason: 'La oferta no tiene título' };
  }
  if (!offer.company || offer.company.trim().length === 0) {
    return { valid: false, reason: 'La oferta no tiene empresa' };
  }
  if (!offer.description || offer.description.trim().length === 0) {
    return { valid: false, reason: 'La oferta no tiene descripción' };
  }

  // Must have application email or URL
  const hasEmail =
    offer.application_email && offer.application_email.trim().length > 0;
  const hasUrl =
    offer.application_url && offer.application_url.trim().length > 0;
  if (!hasEmail && !hasUrl) {
    return {
      valid: false,
      reason: 'La oferta no tiene email ni URL de contacto',
    };
  }

  // Check duplicate hash
  if (offer.unique_hash && sentOfferHashes.includes(offer.unique_hash)) {
    return { valid: false, reason: 'Oferta duplicada' };
  }

  // City check — warn but don't reject (preferencia, no requisito)
  if (criteria.city && offer.city) {
    const criteriaCity = criteria.city.toLowerCase().trim();
    const offerCity = offer.city.toLowerCase().trim();
    if (!offerCity.includes(criteriaCity) && !criteriaCity.includes(offerCity)) {
      console.warn(`[validation] Ciudad no coincide: busca="${criteria.city}", oferta="${offer.city}"`)
    }
  }

  // Work mode check — warn but don't reject
  if (criteria.work_mode && offer.work_mode) {
    if (offer.work_mode.toLowerCase().trim() !== criteria.work_mode.toLowerCase().trim()) {
      console.warn(`[validation] Modalidad no coincide: busca="${criteria.work_mode}", oferta="${offer.work_mode}"`)
    }
  }

  // Check spam indicators
  const descLower = (offer.description || '').toLowerCase();
  for (const indicator of SPAM_INDICATORS) {
    if (descLower.includes(indicator)) {
      return {
        valid: false,
        reason: `La oferta contiene indicadores de spam: "${indicator}"`,
      };
    }
  }

  return { valid: true };
}

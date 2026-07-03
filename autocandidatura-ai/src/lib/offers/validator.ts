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
    description: string;
    applicationEmail: string | null;
    applicationUrl: string | null;
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
    offer.applicationEmail && offer.applicationEmail.trim().length > 0;
  const hasUrl =
    offer.applicationUrl && offer.applicationUrl.trim().length > 0;
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

  // Check city match
  if (criteria.city && offer.city) {
    const criteriaCity = criteria.city.toLowerCase().trim();
    const offerCity = offer.city.toLowerCase().trim();
    if (!offerCity.includes(criteriaCity) && !criteriaCity.includes(offerCity)) {
      return {
        valid: false,
        reason: `La ciudad no coincide (se busca: ${criteria.city}, oferta: ${offer.city})`,
      };
    }
  }

  // Check work_mode match
  if (criteria.work_mode && offer.work_mode) {
    if (offer.work_mode.toLowerCase().trim() !== criteria.work_mode.toLowerCase().trim()) {
      return {
        valid: false,
        reason: `El modo de trabajo no coincide (se busca: ${criteria.work_mode}, oferta: ${offer.work_mode})`,
      };
    }
  }

  // Check spam indicators
  const descLower = offer.description.toLowerCase();
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

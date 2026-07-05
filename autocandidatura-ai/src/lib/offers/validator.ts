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
  if (!offer.title) return { valid: false, reason: 'Sin título' }
  if (!offer.company) return { valid: false, reason: 'Sin empresa' }

  return { valid: true };
}

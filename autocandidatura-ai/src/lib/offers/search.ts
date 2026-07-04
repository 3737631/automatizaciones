import type { ParsedInstruction, JobOffer } from '@/types';
import { generateUniqueHash } from '@/lib/utils';

const MOCK_COMPANIES = [
  'TechCorp Spain', 'DataFlow Solutions', 'InnoSoft',
  'CloudBase Systems', 'NeuralWorks', 'DevForge',
  'CodeBridge Technologies', 'SmartPixels',
];

const MOCK_CITIES = [
  'Madrid', 'Barcelona', 'Valencia', 'Sevilla',
  'Bilbao', 'Málaga', 'Zaragoza', 'A Coruña',
];

const MOCK_WORK_MODES = ['presencial', 'remoto', 'hibrido'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMockOffers(criteria: ParsedInstruction): Partial<JobOffer>[] {
  const count = Math.floor(Math.random() * 4) + 5; // 5 - 8 offers
  const offers: Partial<JobOffer>[] = [];

  for (let i = 0; i < count; i++) {
    const title = criteria.desired_role
      ? `${criteria.desired_role} ${['Junior', 'Senior', 'Especialista', 'Técnico', ''][Math.floor(Math.random() * 4)]}`
      : pick([
          'Desarrollador Full Stack',
          'Analista de Datos',
          'Ingeniero de Software',
          'Técnico de Sistemas',
          'Product Manager',
          'Diseñador UX/UI',
        ]);

    const company = pick(MOCK_COMPANIES) + ` ${String.fromCharCode(65 + i)}`;
    const city = criteria.city || pick(MOCK_CITIES);
    const workMode =
      criteria.work_mode || pick(MOCK_WORK_MODES);
    const hasEmail = Math.random() > 0.2;
    const hasUrl = !hasEmail || Math.random() > 0.5;

    const offer: Partial<JobOffer> = {
      title: title.trim(),
      company,
      description: `Buscamos ${title.trim()} para unirse a ${company} en ${city}. Valoramos experiencia en tecnologías modernas, trabajo en equipo y orientación a resultados. Ofrecemos contrato indefinido, formación continua y plan de carrera.`,
      city: Math.random() > 0.15 ? city : undefined,
      work_mode: Math.random() > 0.15 ? workMode : undefined,
      application_email: hasEmail ? `rrhh@${company.toLowerCase().replace(/\s+/g, '')}.com` : undefined,
      application_url: hasUrl ? `https://${company.toLowerCase().replace(/\s+/g, '')}.com/candidaturas` : undefined,
      source: 'mock',
      requirements: criteria.skills?.length
        ? criteria.skills.join(', ')
        : 'Node.js, TypeScript, React',
      published_at: new Date().toISOString(),
    };

    // Generate hash based on title + company
    offer.unique_hash = generateUniqueHash({
      title: offer.title!,
      company: offer.company!,
      description: offer.description,
    });

    offers.push(offer);
  }

  return offers;
}

export async function searchOffers(
  criteria: ParsedInstruction
): Promise<Partial<JobOffer>[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return generateMockOffers(criteria);
}

export async function addManualOffer(
  offer: Omit<JobOffer, 'id' | 'created_at' | 'updated_at'>
): Promise<JobOffer> {
  // Mock — in production, insert into Supabase
  const newOffer: JobOffer = {
    ...offer,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return newOffer;
}

export type OfferSource = 'mock' | 'infojobs' | 'linkedin' | 'indeed' | 'manual';

export interface OfferSourceConfig {
  source: OfferSource;
  enabled: boolean;
  searchFn: (criteria: ParsedInstruction) => Promise<Partial<JobOffer>[]>;
}

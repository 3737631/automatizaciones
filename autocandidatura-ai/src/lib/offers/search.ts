import type { ParsedInstruction, JobOffer } from '@/types';
import { generateUniqueHash } from '@/lib/utils';

const MOCK_COMPANIES = [
  'TechCorp Spain', 'DataFlow Solutions', 'InnoSoft',
  'CloudBase Systems', 'NeuralWorks', 'DevForge',
  'CodeBridge Technologies', 'SmartPixels',
  'Hospital Clínico', 'Sanitas', 'Quirón Salud', 'Roche',
  'Grupo Hospitalario HM', 'Mutua Madrileña', 'Mapfre',
];

const MOCK_CITIES = [
  'Madrid', 'Barcelona', 'Valencia', 'Sevilla',
  'Bilbao', 'Málaga', 'Zaragoza', 'A Coruña',
];

const MOCK_WORK_MODES = ['presencial', 'remoto', 'hibrido'];

const ROLE_DATABASE: Record<string, { titles: string[]; skills: string[]; desc: string }> = {
  medico: {
    titles: ['Médico de Familia', 'Médico Internista', 'Médico Urgencias', 'Médico Especialista', 'Médico General', 'Pediatra', 'Cardiólogo'],
    skills: ['Diagnóstico clínico', 'Atención al paciente', 'Historia clínica', 'Trabajo en equipo', 'Gestión sanitaria'],
    desc: 'Buscamos médico para incorporarse a nuestro equipo sanitario. Valoramos experiencia clínica, orientación al paciente y capacidad de trabajo multidisciplinar.',
  },
  enfermero: {
    titles: ['Enfermero/a', 'Enfermero/a de Urgencias', 'Enfermero/a de Quirófano', 'Enfermero/a Geriátrico', 'Enfermero/a de Atención Primaria'],
    skills: ['Cuidados de enfermería', 'Administración de medicación', 'Cuidados críticos', 'Triage', 'Trabajo en equipo'],
    desc: 'Se precisa enfermero/a para unidad hospitalaria. Contrato estable, turnos rotativos y formación continua.',
  },
  abogado: {
    titles: ['Abogado/a', 'Abogado/a Laboralista', 'Abogado/a Mercantil', 'Abogado/a Penalista', 'Asesor Jurídico'],
    skills: ['Derecho procesal', 'Redacción jurídica', 'Negociación', 'Derecho laboral', 'Litigación'],
    desc: 'Bufete de abogados busca letrado/a para incorporarse a nuestro equipo. Valoramos experiencia y capacidad de análisis.',
  },
  profesor: {
    titles: ['Profesor/a', 'Profesor/a de Secundaria', 'Maestro/a de Primaria', 'Profesor/a de Universidad', 'Docente'],
    skills: ['Docencia', 'Planificación educativa', 'Evaluación', 'Comunicación', 'Tutoría'],
    desc: 'Centro educativo busca docente para incorporarse a su claustro. Ofrecemos proyecto educativo innovador y desarrollo profesional.',
  },
  ingeniero: {
    titles: ['Ingeniero/a', 'Ingeniero/a de Caminos', 'Ingeniero/a Industrial', 'Ingeniero/a Civil', 'Ingeniero/a de Obras'],
    skills: ['Proyectos de ingeniería', 'Dirección de obra', 'Autocad', 'Gestión de proyectos', 'Presupuestos'],
    desc: 'Empresa de ingeniería busca profesional para departamento técnico. Proyectos nacionales e internacionales.',
  },
  comercial: {
    titles: ['Comercial', 'Ejecutivo de Ventas', 'Representante Comercial', 'Agente Comercial', 'Key Account Manager'],
    skills: ['Ventas', 'Negociación', 'CRM', 'Captación de clientes', 'Cierre de ventas'],
    desc: 'Importante empresa del sector busca comercial para expandir cartera de clientes. Buenos ingresos variables.',
  },
  administrativo: {
    titles: ['Administrativo/a', 'Auxiliar Administrativo', 'Secretario/a', 'Recepcionista', 'Asistente de Dirección'],
    skills: ['Ofimática', 'Gestión documental', 'Atención al cliente', 'Archivo', 'Contabilidad básica'],
    desc: 'Empresa del sector servicios busca administrativo/a para gestión de oficina. Buen ambiente laboral.',
  },
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function findRole(desiredRole: string): string | null {
  const lower = desiredRole.toLowerCase().trim();
  for (const [key, _] of Object.entries(ROLE_DATABASE)) {
    if (lower.includes(key)) return key;
  }
  return null;
}

function generateMockOffers(criteria: ParsedInstruction): Partial<JobOffer>[] {
  const count = Math.floor(Math.random() * 4) + 5;
  const offers: Partial<JobOffer>[] = [];

  const roleKey = criteria.desired_role ? findRole(criteria.desired_role) : null;

  for (let i = 0; i < count; i++) {
    let title: string;
    let company: string;
    let description: string;
      let skills: string[];

    if (roleKey) {
      const role = ROLE_DATABASE[roleKey];
      title = pick(role.titles);
      company = pick(MOCK_COMPANIES) + ` ${String.fromCharCode(65 + i)}`;
      skills = role.skills;
      description = role.desc;
    } else if (criteria.desired_role) {
      const suffix = pick(['Junior', 'Senior', 'Especialista', 'Técnico', '']);
      title = `${criteria.desired_role} ${suffix}`.trim();
      company = pick(MOCK_COMPANIES) + ` ${String.fromCharCode(65 + i)}`;
      skills = criteria.skills?.length ? criteria.skills : ['Habilidades profesionales'];
      description = `Buscamos ${title} para unirse a ${company}. Contrato indefinido, buen ambiente laboral y oportunidades de crecimiento.`;
    } else {
      title = pick(['Desarrollador Full Stack', 'Analista de Datos', 'Ingeniero de Software', 'Técnico de Sistemas', 'Product Manager', 'Diseñador UX/UI']);
      company = pick(MOCK_COMPANIES) + ` ${String.fromCharCode(65 + i)}`;
      skills = criteria.skills?.length ? criteria.skills : ['Node.js', 'TypeScript', 'React'];
      description = `Buscamos ${title} para unirse a ${company} en ${criteria.city || 'Madrid'}. Valoramos experiencia en tecnologías modernas.`;
    }

    const city = criteria.city || pick(MOCK_CITIES);
    const workMode = criteria.work_mode || pick(MOCK_WORK_MODES);
    const hasEmail = Math.random() > 0.2;

    const offer: Partial<JobOffer> = {
      title,
      company,
      description,
      city: Math.random() > 0.15 ? city : undefined,
      work_mode: Math.random() > 0.15 ? workMode : undefined,
      application_email: hasEmail ? `rrhh@${company.toLowerCase().replace(/\s+/g, '')}.com` : undefined,
      application_url: !hasEmail ? `https://${company.toLowerCase().replace(/\s+/g, '')}.com/candidaturas` : undefined,
      source: 'mock',
      requirements: skills.join(', '),
      published_at: new Date().toISOString(),
    };

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

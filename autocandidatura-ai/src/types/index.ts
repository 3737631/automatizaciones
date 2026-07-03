export * from './database';

export type AgentStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error' | 'stopped';
export type StepStatus = 'pending' | 'processing' | 'completed' | 'error';
export type OfferStatus = 'new' | 'compatible' | 'incompatible' | 'applied' | 'error' | 'duplicate';
export type ApplicationStatus = 'prepared' | 'sent' | 'failed';
export type WorkMode = 'presencial' | 'remoto' | 'hibrido';

export interface ParsedInstruction {
  desired_role: string;
  sector?: string;
  city?: string;
  province?: string;
  country?: string;
  work_mode?: string;
  skills?: string[];
  minimum_compatibility_score: number;
  daily_limit: number;
}

export interface CVAnalysisResult {
  summary: string;
  detected_skills: string[];
  detected_experience: string;
  compatible_roles: string[];
  compatible_sectors: string[];
  recommendations: string[];
}

export interface OfferAnalysisResult {
  compatibility_score: number;
  compatibility_reason: string;
  matching_skills: string[];
  missing_skills: string[];
  recommendation: 'apply' | 'maybe' | 'skip';
}

export interface GeneratedMessage {
  subject: string;
  message: string;
}

export interface StepUpdate {
  step_name: string;
  status: StepStatus;
  details?: string;
}

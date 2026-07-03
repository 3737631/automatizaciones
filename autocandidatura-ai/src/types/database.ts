export interface Session {
  id: string;
  session_token: string;
  connected_email: string | null;
  email_provider: string | null;
  gmail_access_token_encrypted: string | null;
  gmail_refresh_token_encrypted: string | null;
  consent_accepted: boolean;
  consent_accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CV {
  id: string;
  session_id: string;
  file_url: string;
  file_name: string;
  extracted_text: string | null;
  ai_summary: string | null;
  detected_skills: string[] | null;
  detected_experience: string | null;
  compatible_roles: string[] | null;
  compatible_sectors: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface AgentInstruction {
  id: string;
  session_id: string;
  raw_instruction: string;
  desired_role: string | null;
  sector: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  work_mode: string | null;
  skills: string[] | null;
  minimum_compatibility_score: number | null;
  daily_limit: number | null;
  created_at: string;
  updated_at: string;
}

export interface JobOffer {
  id: string;
  session_id: string;
  title: string;
  company: string;
  city: string | null;
  province: string | null;
  country: string | null;
  work_mode: string | null;
  source: string | null;
  source_url: string | null;
  application_email: string | null;
  application_url: string | null;
  description: string | null;
  requirements: string | null;
  published_at: string | null;
  compatibility_score: number | null;
  compatibility_reason: string | null;
  status: string;
  unique_hash: string;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  session_id: string;
  job_offer_id: string;
  company: string;
  application_email: string;
  subject: string;
  message: string;
  cv_url: string | null;
  status: string;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentRun {
  id: string;
  session_id: string;
  instruction_id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  total_offers_found: number;
  total_applications_sent: number;
  total_errors: number;
  created_at: string;
  updated_at: string;
}

export interface AgentStep {
  id: string;
  agent_run_id: string;
  step_name: string;
  status: string;
  details: string | null;
  created_at: string;
}

export interface ApplicationLog {
  id: string;
  session_id: string;
  job_offer_id: string | null;
  application_id: string | null;
  action: string;
  details: string | null;
  created_at: string;
}

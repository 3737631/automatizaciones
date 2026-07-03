-- ==========================================
-- AutoCandidatura AI - Supabase Schema
-- ==========================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- TABLES
-- ==========================================

-- 1. Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  connected_email TEXT,
  email_provider TEXT,
  gmail_access_token_encrypted TEXT,
  gmail_refresh_token_encrypted TEXT,
  consent_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  consent_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CVs
CREATE TABLE IF NOT EXISTS cvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  extracted_text TEXT,
  ai_summary TEXT,
  detected_skills TEXT[],
  detected_experience TEXT,
  compatible_roles TEXT[],
  compatible_sectors TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Agent Instructions
CREATE TABLE IF NOT EXISTS agent_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  raw_instruction TEXT NOT NULL,
  desired_role TEXT,
  sector TEXT,
  city TEXT,
  province TEXT,
  country TEXT,
  work_mode TEXT,
  skills TEXT[],
  minimum_compatibility_score INTEGER DEFAULT 60,
  daily_limit INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Job Offers
CREATE TABLE IF NOT EXISTS job_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  city TEXT,
  province TEXT,
  country TEXT,
  work_mode TEXT,
  source TEXT,
  source_url TEXT,
  application_email TEXT,
  application_url TEXT,
  description TEXT,
  requirements TEXT,
  published_at TIMESTAMPTZ,
  compatibility_score INTEGER,
  compatibility_reason TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  unique_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, unique_hash)
);

-- 5. Applications
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  job_offer_id UUID NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  application_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  cv_url TEXT,
  status TEXT NOT NULL DEFAULT 'prepared',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Agent Runs
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  instruction_id UUID NOT NULL REFERENCES agent_instructions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'idle',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  total_offers_found INTEGER DEFAULT 0,
  total_applications_sent INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Agent Steps
CREATE TABLE IF NOT EXISTS agent_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Application Logs
CREATE TABLE IF NOT EXISTS application_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  job_offer_id UUID REFERENCES job_offers(id) ON DELETE SET NULL,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_cvs_session_id ON cvs(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_instructions_session_id ON agent_instructions(session_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_session_id ON job_offers(session_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_status ON job_offers(status);
CREATE INDEX IF NOT EXISTS idx_job_offers_created_at ON job_offers(created_at);
CREATE INDEX IF NOT EXISTS idx_applications_session_id ON applications(session_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_session_id ON agent_runs(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_steps_agent_run_id ON agent_steps(agent_run_id);
CREATE INDEX IF NOT EXISTS idx_application_logs_session_id ON application_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_application_logs_created_at ON application_logs(created_at);

-- ==========================================
-- TRIGGER: auto-update updated_at
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN (
      'sessions', 'cvs', 'agent_instructions', 'job_offers',
      'applications', 'agent_runs'
    )
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      t
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- STORAGE: CVs bucket
-- =========================================--

INSERT INTO storage.buckets (id, name, public) VALUES ('cvs', 'cvs', FALSE)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES: anon (by session_token)
-- ==========================================

-- Sessions: anon can read/update their own session by session_token
CREATE POLICY "anon_select_own_session" ON sessions
  FOR SELECT USING (session_token = current_setting('request.headers')::json->>'x-session-token');

CREATE POLICY "anon_update_own_session" ON sessions
  FOR UPDATE USING (session_token = current_setting('request.headers')::json->>'x-session-token');

CREATE POLICY "anon_insert_own_session" ON sessions
  FOR INSERT WITH CHECK (true);

-- CVs: anon can CRUD their own
CREATE POLICY "anon_select_own_cvs" ON cvs
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE session_token = current_setting('request.headers')::json->>'x-session-token')
  );

CREATE POLICY "anon_insert_own_cvs" ON cvs
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE session_token = current_setting('request.headers')::json->>'x-session-token')
  );

CREATE POLICY "anon_update_own_cvs" ON cvs
  FOR UPDATE USING (
    session_id IN (SELECT id FROM sessions WHERE session_token = current_setting('request.headers')::json->>'x-session-token')
  );

CREATE POLICY "anon_delete_own_cvs" ON cvs
  FOR DELETE USING (
    session_id IN (SELECT id FROM sessions WHERE session_token = current_setting('request.headers')::json->>'x-session-token')
  );

-- Agent Instructions: anon can CRUD their own
CREATE POLICY "anon_select_own_instructions" ON agent_instructions
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE session_token = current_setting('request.headers')::json->>'x-session-token')
  );

CREATE POLICY "anon_insert_own_instructions" ON agent_instructions
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE session_token = current_setting('request.headers')::json->>'x-session-token')
  );

CREATE POLICY "anon_update_own_instructions" ON agent_instructions
  FOR UPDATE USING (
    session_id IN (SELECT id FROM sessions WHERE session_token = current_setting('request.headers')::json->>'x-session-token')
  );

CREATE POLICY "anon_delete_own_instructions" ON agent_instructions
  FOR DELETE USING (
    session_id IN (SELECT id FROM sessions WHERE session_token = current_setting('request.headers')::json->>'x-session-token')
  );

-- Job Offers: anon can CRUD their own
CREATE POLICY "anon_select_own_offers" ON job_offers
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE session_token = current_setting('request.headers')::json->>'x-session-token')
  );

CREATE POLICY "anon_insert_own_offers" ON job_offers
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE session_token = current_setting('request.headers')::json->>'x-session-token')
  );

CREATE POLICY "anon_update_own_offers" ON job_offers
  FOR UPDATE USING (
    session_id IN (SELECT id FROM sessions WHERE session_token = current_setting('request.headers')::json->>'x-session-token')
  );

CREATE POLICY "anon_delete_own_offers" ON job_offers
  FOR DELETE USING (
    session_id IN (SELECT id FROM sessions WHERE session_token = current_setting('request.headers')::json->>'x-session-token')
  );

-- Applications: anon can CRUD their own
CREATE POLICY "anon_select_own_applications" ON applications
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE session_token = current_setting('request.headers')::json->>'x-session-token')
  );

CREATE POLICY "anon_insert_own_applications" ON applications
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE session_token = current_setting('request.headers')::json->>'x-session-token')
  );

CREATE POLICY "anon_update_own_applications" ON applications
  FOR UPDATE USING (
    session_id IN (SELECT id FROM sessions WHERE session_token = current_setting('request.headers')::json->>'x-session-token')
  );

CREATE POLICY "anon_delete_own_applications" ON applications
  FOR DELETE USING (
    session_id IN (SELECT id FROM sessions WHERE session_token = current_setting('request.headers')::json->>'x-session-token')
  );

-- Agent Runs: anon can CRUD their own
CREATE POLICY "anon_select_own_runs" ON agent_runs
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE session_token = current_setting('request.headers')::json->>'x-session-token')
  );

CREATE POLICY "anon_insert_own_runs" ON agent_runs
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE session_token = current_setting('request.headers')::json->>'x-session-token')
  );

CREATE POLICY "anon_update_own_runs" ON agent_runs
  FOR UPDATE USING (
    session_id IN (SELECT id FROM sessions WHERE session_token = current_setting('request.headers')::json->>'x-session-token')
  );

CREATE POLICY "anon_delete_own_runs" ON agent_runs
  FOR DELETE USING (
    session_id IN (SELECT id FROM sessions WHERE session_token = current_setting('request.headers')::json->>'x-session-token')
  );

-- Agent Steps: anon can select/insert their own (tied to their runs)
CREATE POLICY "anon_select_own_steps" ON agent_steps
  FOR SELECT USING (
    agent_run_id IN (
      SELECT ar.id FROM agent_runs ar
      JOIN sessions s ON ar.session_id = s.id
      WHERE s.session_token = current_setting('request.headers')::json->>'x-session-token'
    )
  );

CREATE POLICY "anon_insert_own_steps" ON agent_steps
  FOR INSERT WITH CHECK (
    agent_run_id IN (
      SELECT ar.id FROM agent_runs ar
      JOIN sessions s ON ar.session_id = s.id
      WHERE s.session_token = current_setting('request.headers')::json->>'x-session-token'
    )
  );

-- Application Logs: anon can select/insert their own
CREATE POLICY "anon_select_own_logs" ON application_logs
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE session_token = current_setting('request.headers')::json->>'x-session-token')
  );

CREATE POLICY "anon_insert_own_logs" ON application_logs
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM sessions WHERE session_token = current_setting('request.headers')::json->>'x-session-token')
  );

-- Storage: anon can CRUD their own files in cvs bucket
CREATE POLICY "anon_select_own_cv_files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'cvs' AND (storage.foldername(name))[1] = current_setting('request.headers')::json->>'x-session-token'
  );

CREATE POLICY "anon_insert_own_cv_files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'cvs' AND (storage.foldername(name))[1] = current_setting('request.headers')::json->>'x-session-token'
  );

CREATE POLICY "anon_update_own_cv_files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'cvs' AND (storage.foldername(name))[1] = current_setting('request.headers')::json->>'x-session-token'
  );

CREATE POLICY "anon_delete_own_cv_files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'cvs' AND (storage.foldername(name))[1] = current_setting('request.headers')::json->>'x-session-token'
  );

-- ==========================================
-- RLS POLICIES: service_role (full access)
-- ==========================================

CREATE POLICY "service_all_sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_cvs" ON cvs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_instructions" ON agent_instructions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_offers" ON job_offers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_applications" ON applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_runs" ON agent_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_steps" ON agent_steps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_logs" ON application_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_cv_files" ON storage.objects FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- CareerOps — Initial Multi-Tenant Schema (Neon / PostgreSQL)
-- Auth table (users) + 18 core domain tables + indexes + triggers + RLS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- Utility: automatic updated_at trigger & session user helper
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', TRUE), '')::uuid;
$$;

-- ----------------------------------------------------------------------------
-- 0. users (Authentication & Multi-tenant root)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 1. profiles (1:1 with users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  summary TEXT,
  target_salary NUMERIC(12, 2),
  currency TEXT NOT NULL DEFAULT 'BRL',
  modality_preference TEXT NOT NULL DEFAULT 'remote_or_local'
    CHECK (modality_preference IN ('remote', 'hybrid', 'onsite', 'remote_or_local', 'any')),
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. professional_experiences
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.professional_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  location TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_experience_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- ----------------------------------------------------------------------------
-- 3. professional_skills
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.professional_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  proficiency TEXT NOT NULL DEFAULT 'intermediate'
    CHECK (proficiency IN ('basic', 'intermediate', 'advanced', 'expert', 'learning')),
  years_experience NUMERIC(4, 1),
  is_verified BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category, name)
);

-- ----------------------------------------------------------------------------
-- 4. education
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  degree TEXT NOT NULL,
  field_of_study TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('completed', 'in_progress', 'paused')),
  semester TEXT,
  expected_graduation DATE,
  completed_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. certifications
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuer TEXT,
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'in_progress', 'expired')),
  issued_at DATE,
  expires_at DATE,
  credential_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. companies
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  website TEXT,
  careers_url TEXT,
  industry TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, normalized_name)
);

-- ----------------------------------------------------------------------------
-- 7. job_sources
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  portal_type TEXT NOT NULL DEFAULT 'custom'
    CHECK (portal_type IN ('gupy', 'infojobs', 'linkedin', 'greenhouse', 'ashby', 'lever', 'workday', 'websearch', 'custom')),
  careers_url TEXT,
  scan_method TEXT NOT NULL DEFAULT 'websearch',
  scan_query TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_scanned_at TIMESTAMPTZ,
  last_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

-- ----------------------------------------------------------------------------
-- 8. job_listings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.job_sources(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  external_id TEXT,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  modality TEXT NOT NULL DEFAULT 'unknown'
    CHECK (modality IN ('remote', 'hybrid', 'onsite', 'unknown')),
  seniority TEXT NOT NULL DEFAULT 'unknown'
    CHECK (seniority IN ('intern', 'junior', 'mid', 'senior', 'lead', 'unknown')),
  salary_min NUMERIC(12, 2),
  salary_max NUMERIC(12, 2),
  salary_currency TEXT DEFAULT 'BRL',
  salary_text TEXT,
  contract_type TEXT,
  posted_at TIMESTAMPTZ,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  is_saved BOOLEAN NOT NULL DEFAULT FALSE,
  is_discarded BOOLEAN NOT NULL DEFAULT FALSE,
  discard_reason TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewing', 'evaluated', 'saved', 'discarded', 'applied')),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, url),
  CONSTRAINT chk_salary_range CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_max >= salary_min)
);

-- ----------------------------------------------------------------------------
-- 9. job_requirements
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.job_listings(id) ON DELETE CASCADE,
  requirement_type TEXT NOT NULL DEFAULT 'mandatory'
    CHECK (requirement_type IN ('mandatory', 'desirable', 'technology')),
  label TEXT NOT NULL,
  category TEXT,
  is_met BOOLEAN,
  evidence_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 10. job_evaluations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.job_listings(id) ON DELETE CASCADE,
  report_number INTEGER,
  report_path TEXT,
  score NUMERIC(3, 2) NOT NULL CHECK (score >= 0 AND score <= 5),
  verdict TEXT,
  summary TEXT,
  why_matches TEXT,
  met_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  improvement_tips JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_used TEXT,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, job_id)
);

-- ----------------------------------------------------------------------------
-- 11. resumes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_role TEXT,
  summary TEXT,
  source_markdown TEXT NOT NULL,
  is_master BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 12. resume_versions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resume_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.job_listings(id) ON DELETE SET NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  report_number INTEGER,
  html_path TEXT,
  pdf_path TEXT,
  tailored_summary TEXT,
  tailored_content TEXT,
  ats_score NUMERIC(5, 2),
  page_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 13. applications (11-stage Kanban + strict applied confirmation)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.job_listings(id) ON DELETE SET NULL,
  resume_version_id UUID REFERENCES public.resume_versions(id) ON DELETE SET NULL,
  tracker_number INTEGER,
  company_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  job_url TEXT,
  stage TEXT NOT NULL DEFAULT 'vaga_identificada'
    CHECK (stage IN (
      'vaga_identificada',
      'em_analise',
      'curriculo_preparado',
      'candidatura_enviada',
      'triagem',
      'entrevista_rh',
      'entrevista_tecnica',
      'proposta_recebida',
      'aprovado',
      'reprovado',
      'desistencia'
    )),
  applied_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  applied_at TIMESTAMPTZ,
  expected_salary NUMERIC(12, 2),
  recruiter_name TEXT,
  recruiter_contact TEXT,
  notes TEXT,
  next_action TEXT,
  follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_applied_requires_confirmation
    CHECK (stage <> 'candidatura_enviada' OR applied_confirmed = TRUE)
);

-- ----------------------------------------------------------------------------
-- 14. application_history
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.application_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'web',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 15. interviews
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  interview_type TEXT NOT NULL DEFAULT 'rh'
    CHECK (interview_type IN ('triagem', 'rh', 'tecnica', 'gestor', 'painel', 'proposta', 'outro')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 45 CHECK (duration_minutes > 0),
  interviewer_name TEXT,
  meeting_link TEXT,
  location TEXT,
  preparation_notes TEXT,
  outcome TEXT DEFAULT 'pendente'
    CHECK (outcome IN ('pendente', 'aprovado', 'reprovado', 'remarcado', 'cancelado')),
  feedback_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 16. automation_runs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.job_sources(id) ON DELETE SET NULL,
  run_type TEXT NOT NULL DEFAULT 'scan'
    CHECK (run_type IN ('scan', 'evaluate', 'pdf_batch', 'telegram_notify', 'sync')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  jobs_found INTEGER NOT NULL DEFAULT 0,
  jobs_added INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  log_summary TEXT,
  triggered_by TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 17. notifications
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'in_app'
    CHECK (channel IN ('telegram', 'in_app')),
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'new_job',
      'high_match_job',
      'priority_opportunity',
      'pending_application',
      'upcoming_interview',
      'application_update',
      'automation_error'
    )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 18. user_preferences
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  language TEXT NOT NULL DEFAULT 'pt-BR',
  telegram_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  telegram_chat_id TEXT,
  notify_new_job BOOLEAN NOT NULL DEFAULT TRUE,
  notify_high_match BOOLEAN NOT NULL DEFAULT TRUE,
  min_match_score_notify NUMERIC(3, 2) NOT NULL DEFAULT 3.50,
  notify_pending_application BOOLEAN NOT NULL DEFAULT TRUE,
  notify_upcoming_interview BOOLEAN NOT NULL DEFAULT TRUE,
  notify_status_change BOOLEAN NOT NULL DEFAULT TRUE,
  notify_automation_error BOOLEAN NOT NULL DEFAULT TRUE,
  auto_scan_interval_minutes INTEGER NOT NULL DEFAULT 360,
  default_cv_format TEXT NOT NULL DEFAULT 'a4' CHECK (default_cv_format IN ('a4', 'letter')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_experiences_user ON public.professional_experiences(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_skills_user ON public.professional_skills(user_id, category);
CREATE INDEX IF NOT EXISTS idx_education_user ON public.education(user_id);
CREATE INDEX IF NOT EXISTS idx_certifications_user ON public.certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_user_norm ON public.companies(user_id, normalized_name);
CREATE INDEX IF NOT EXISTS idx_job_sources_user_enabled ON public.job_sources(user_id, enabled);
CREATE INDEX IF NOT EXISTS idx_job_listings_user_status ON public.job_listings(user_id, status, discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_listings_user_modality ON public.job_listings(user_id, modality, seniority);
CREATE INDEX IF NOT EXISTS idx_job_requirements_job ON public.job_requirements(job_id, requirement_type);
CREATE INDEX IF NOT EXISTS idx_job_evaluations_user_score ON public.job_evaluations(user_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_resumes_user_master ON public.resumes(user_id, is_master);
CREATE INDEX IF NOT EXISTS idx_resume_versions_user_job ON public.resume_versions(user_id, job_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_stage ON public.applications(user_id, stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_application_history_app ON public.application_history(application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interviews_user_sched ON public.interviews(user_id, scheduled_at ASC);
CREATE INDEX IF NOT EXISTS idx_automation_runs_user_started ON public.automation_runs(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON public.notifications(user_id, status, created_at DESC);

-- ----------------------------------------------------------------------------
-- Updated_at Triggers
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'profiles', 'professional_experiences', 'professional_skills',
    'education', 'certifications', 'companies', 'job_sources', 'job_listings',
    'job_requirements', 'job_evaluations', 'resumes', 'resume_versions',
    'applications', 'interviews', 'automation_runs', 'user_preferences'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      t, t
    );
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- Audit trigger: automatic application_history entry on stage changes
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_application_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.application_history (user_id, application_id, from_stage, to_stage, changed_by, source, note)
    VALUES (NEW.user_id, NEW.id, NULL, NEW.stage, COALESCE(public.current_app_user_id(), NEW.user_id), 'system', 'Candidatura criada');
  ELSIF TG_OP = 'UPDATE' AND NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.application_history (user_id, application_id, from_stage, to_stage, changed_by, source, note)
    VALUES (NEW.user_id, NEW.id, OLD.stage, NEW.stage, COALESCE(public.current_app_user_id(), NEW.user_id), 'system', 'Alteração de etapa');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_applications_audit_stage ON public.applications;
CREATE TRIGGER trg_applications_audit_stage
AFTER INSERT OR UPDATE OF stage ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.log_application_stage_change();

-- ----------------------------------------------------------------------------
-- Row Level Security (RLS) on domain tables using app.current_user_id
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_own_all" ON public.profiles;
CREATE POLICY "profiles_own_all" ON public.profiles
  FOR ALL USING (id = public.current_app_user_id()) WITH CHECK (id = public.current_app_user_id());

DROP POLICY IF EXISTS "user_preferences_own_all" ON public.user_preferences;
CREATE POLICY "user_preferences_own_all" ON public.user_preferences
  FOR ALL USING (user_id = public.current_app_user_id()) WITH CHECK (user_id = public.current_app_user_id());

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'professional_experiences', 'professional_skills', 'education',
    'certifications', 'companies', 'job_sources', 'job_listings',
    'job_requirements', 'job_evaluations', 'resumes', 'resume_versions',
    'applications', 'application_history', 'interviews', 'automation_runs',
    'notifications'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_own_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL USING (user_id = public.current_app_user_id()) WITH CHECK (user_id = public.current_app_user_id());',
      t || '_own_all', t
    );
  END LOOP;
END;
$$;

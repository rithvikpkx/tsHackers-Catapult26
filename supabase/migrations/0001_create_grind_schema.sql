CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  google_account_id TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Indiana/Indianapolis',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google_calendar',
  provider_account_id TEXT,
  access_scope_read BOOLEAN NOT NULL DEFAULT TRUE,
  access_scope_write BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'connected',
  encrypted_refresh_token TEXT,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.raw_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source_event_id TEXT NOT NULL,
  source_calendar_id TEXT,
  title_raw TEXT NOT NULL,
  description_raw TEXT,
  location_raw TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  event_type_detected TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  is_all_day BOOLEAN NOT NULL DEFAULT FALSE,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, source_event_id)
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source_event_id TEXT,
  source_system TEXT NOT NULL DEFAULT 'google_calendar',
  assignment_id_external_optional TEXT,
  title TEXT NOT NULL,
  assignment_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  recommended_start_time TIMESTAMPTZ,
  actual_start_time TIMESTAMPTZ,
  submission_time TIMESTAMPTZ,
  time_taken_minutes INTEGER,
  submission_offset_minutes INTEGER,
  predicted_delay_minutes INTEGER,
  predicted_completion_time_minutes INTEGER,
  risk_probability NUMERIC(5,4) NOT NULL DEFAULT 0,
  success_probability_before NUMERIC(5,4) NOT NULL DEFAULT 0,
  success_probability_after NUMERIC(5,4) NOT NULL DEFAULT 0,
  confidence_score NUMERIC(5,4) NOT NULL DEFAULT 0,
  estimated_effort_minutes_base INTEGER NOT NULL DEFAULT 0,
  estimated_effort_minutes_adjusted INTEGER NOT NULL DEFAULT 0,
  task_status TEXT NOT NULL DEFAULT 'upcoming',
  raw_title TEXT,
  raw_description TEXT,
  task_priority TEXT NOT NULL DEFAULT 'medium',
  is_movable BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT,
  sequence_index INTEGER NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  is_submission_step BOOLEAN NOT NULL DEFAULT FALSE,
  source_mode TEXT NOT NULL DEFAULT 'llm',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.schedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source_event_id TEXT,
  title TEXT NOT NULL,
  event_category TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_movable BOOLEAN NOT NULL DEFAULT FALSE,
  movement_cost_score NUMERIC(5,4) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.distortion_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  profile_version INTEGER NOT NULL DEFAULT 1,
  programming_underestimate_multiplier NUMERIC(5,2) NOT NULL DEFAULT 2.0,
  essay_underestimate_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.8,
  problem_set_underestimate_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.6,
  generic_underestimate_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.4,
  mean_start_delay_minutes INTEGER NOT NULL DEFAULT 1440,
  mean_submission_offset_minutes INTEGER NOT NULL DEFAULT 60,
  best_focus_start_hour INTEGER NOT NULL DEFAULT 21,
  best_focus_end_hour INTEGER NOT NULL DEFAULT 1,
  preferred_days_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_level TEXT NOT NULL DEFAULT 'low',
  source_mode TEXT NOT NULL DEFAULT 'weak_prior',
  availability_mismatch_score NUMERIC(5,4) NOT NULL DEFAULT 0.5,
  reliability_score NUMERIC(5,4) NOT NULL DEFAULT 0.5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  expected_start_time TIMESTAMPTZ,
  actual_start_time TIMESTAMPTZ,
  expected_effort_minutes INTEGER,
  actual_effort_minutes INTEGER,
  due_date TIMESTAMPTZ NOT NULL,
  submission_time TIMESTAMPTZ,
  derived_start_delay_minutes INTEGER,
  derived_submission_offset_minutes INTEGER,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  risk_probability NUMERIC(5,4) NOT NULL,
  success_probability NUMERIC(5,4) NOT NULL,
  risk_level TEXT NOT NULL,
  model_version TEXT NOT NULL DEFAULT 'heuristic-v1',
  explanation_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  available_minutes_before_due INTEGER NOT NULL DEFAULT 0,
  predicted_required_minutes INTEGER NOT NULL DEFAULT 0,
  bottleneck_type TEXT NOT NULL DEFAULT 'capacity'
);

CREATE TABLE IF NOT EXISTS public.interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  intervention_type TEXT NOT NULL,
  summary_text TEXT NOT NULL,
  rationale_text TEXT NOT NULL,
  success_probability_before NUMERIC(5,4) NOT NULL,
  success_probability_after NUMERIC(5,4) NOT NULL,
  risk_probability_before NUMERIC(5,4) NOT NULL,
  risk_probability_after NUMERIC(5,4) NOT NULL,
  calendar_changes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'proposed'
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  intervention_id UUID REFERENCES public.interventions(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  delivery_status TEXT NOT NULL DEFAULT 'queued'
);

CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  subtask_id UUID REFERENCES public.subtasks(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  initiated_from TEXT NOT NULL DEFAULT 'grind',
  session_outcome TEXT
);

CREATE TABLE IF NOT EXISTS public.job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_calendar_connections_user_id ON public.calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_raw_calendar_events_user_id ON public.raw_calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_raw_calendar_events_starts_at ON public.raw_calendar_events(starts_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(task_status);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON public.subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_user_id ON public.schedule_events(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_starts_at ON public.schedule_events(starts_at);
CREATE INDEX IF NOT EXISTS idx_task_observations_task_id ON public.task_observations(task_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_task_id ON public.risk_assessments(task_id);
CREATE INDEX IF NOT EXISTS idx_interventions_task_id ON public.interventions(task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_task_id ON public.focus_sessions(task_id);

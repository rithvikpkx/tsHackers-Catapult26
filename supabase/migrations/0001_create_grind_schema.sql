-- Enable UUID generation for Supabase tables
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create the primary task table for Grind
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default-user',
  title TEXT NOT NULL,
  course TEXT NOT NULL,
  task_type TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  estimated_effort_hours NUMERIC NOT NULL CHECK (estimated_effort_hours >= 0),
  corrected_effort_hours NUMERIC CHECK (corrected_effort_hours >= 0),
  course_risk_prior NUMERIC CHECK (course_risk_prior >= 0 AND course_risk_prior <= 1),
  failure_risk NUMERIC CHECK (failure_risk >= 0 AND failure_risk <= 1),
  risk_explanation TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  start_timestamp TIMESTAMPTZ,
  end_timestamp TIMESTAMPTZ,
  actual_duration_hours NUMERIC CHECK (actual_duration_hours >= 0),
  predicted_start_delay_hours NUMERIC CHECK (predicted_start_delay_hours >= 0),
  predicted_completion_hours NUMERIC CHECK (predicted_completion_hours >= 0),
  best_work_window TEXT,
  preferred_work_times JSONB,
  data_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- Event log table for task lifecycle and user signals.
CREATE TABLE IF NOT EXISTS public.task_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default-user',
  task_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON public.task_events(task_id);
CREATE INDEX IF NOT EXISTS idx_task_events_event_type ON public.task_events(event_type);
CREATE INDEX IF NOT EXISTS idx_task_events_occurred_at ON public.task_events(occurred_at);

-- Calendar blocks for availability, classes, and interventions.
CREATE TABLE IF NOT EXISTS public.calendar_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default-user',
  task_id TEXT,
  source TEXT NOT NULL,
  block_type TEXT NOT NULL,
  start TIMESTAMPTZ NOT NULL,
  end TIMESTAMPTZ NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_blocks_user_id ON public.calendar_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_start ON public.calendar_blocks(start);
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_end ON public.calendar_blocks(end);

-- Training records for passive fine-tuning and feature extraction.
CREATE TABLE IF NOT EXISTS public.training_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default-user',
  task_id TEXT NOT NULL,
  features JSONB NOT NULL,
  label JSONB NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_examples_task_id ON public.training_examples(task_id);
CREATE INDEX IF NOT EXISTS idx_training_examples_user_id ON public.training_examples(user_id);

-- User signal summaries for personalizing predictions.
CREATE TABLE IF NOT EXISTS public.user_signals (
  user_id TEXT PRIMARY KEY,
  recent_completion_rate NUMERIC NOT NULL DEFAULT 0,
  recent_overdue_count NUMERIC NOT NULL DEFAULT 0,
  start_lag_hours NUMERIC NOT NULL DEFAULT 0,
  focus_block_accept_rate NUMERIC NOT NULL DEFAULT 0,
  focus_block_completion_rate NUMERIC NOT NULL DEFAULT 0,
  preferred_work_times JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  timezone text not null default 'UTC',
  major text,
  risk_tolerance text not null default 'balanced',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  source text not null default 'manual_import',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tasks (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  course text not null,
  task_type text,
  course_snapshot jsonb,
  title text not null,
  due_date timestamptz not null,
  estimated_effort_hours double precision not null check (estimated_effort_hours >= 0),
  corrected_effort_hours double precision check (corrected_effort_hours is null or corrected_effort_hours >= 0),
  course_risk_prior double precision check (course_risk_prior is null or (course_risk_prior >= 0 and course_risk_prior <= 1)),
  failure_risk double precision check (failure_risk is null or (failure_risk >= 0 and failure_risk <= 1)),
  risk_explanation text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'blocked', 'done')),
  source text not null default 'manual_import',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, id)
);

create table if not exists public.task_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null,
  event_type text not null,
  occurred_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.interventions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null,
  risk_before double precision not null check (risk_before >= 0 and risk_before <= 1),
  risk_after double precision not null check (risk_after >= 0 and risk_after <= 1),
  before_json jsonb not null,
  after_json jsonb not null,
  smallest_next_step text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google',
  provider_user_email text,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, provider)
);

create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  status text not null default 'running' check (status in ('running', 'success', 'failed')),
  details jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz
);

create index if not exists idx_tasks_user_due_date on public.tasks(user_id, due_date);
create index if not exists idx_task_events_user_time on public.task_events(user_id, occurred_at desc);

alter table public.tasks add column if not exists task_type text;
alter table public.tasks add column if not exists course_snapshot jsonb;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.tasks enable row level security;
alter table public.task_events enable row level security;
alter table public.interventions enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.ingestion_runs enable row level security;

drop policy if exists "profiles owner access" on public.profiles;
create policy "profiles owner access" on public.profiles
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "courses owner access" on public.courses;
create policy "courses owner access" on public.courses
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tasks owner access" on public.tasks;
create policy "tasks owner access" on public.tasks
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "task events owner access" on public.task_events;
create policy "task events owner access" on public.task_events
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "interventions owner access" on public.interventions;
create policy "interventions owner access" on public.interventions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "calendar connections owner access" on public.calendar_connections;
create policy "calendar connections owner access" on public.calendar_connections
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ingestion runs owner access" on public.ingestion_runs;
create policy "ingestion runs owner access" on public.ingestion_runs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_courses_updated_at on public.courses;
create trigger trg_courses_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists trg_calendar_connections_updated_at on public.calendar_connections;
create trigger trg_calendar_connections_updated_at
before update on public.calendar_connections
for each row execute function public.set_updated_at();

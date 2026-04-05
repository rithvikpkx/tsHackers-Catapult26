# Grind

Fresh MVP scaffold for a modular academic execution app.

## Project layout

- `apps/frontend`: Next.js App Router app with the current Grind implementation
- `supabase`: database schema for tasks, subtasks, profiles, risk assessments, interventions, and notifications
- `services/ml`: placeholder for future Python experimentation; v1 logic lives in the Next.js app

## Current build shape

- Demo-first seeded pipeline that runs end-to-end inside the app
- Modular domain code for normalization, subtask generation, profile modeling, risk scoring, interventions, email payloads, and voice scripts
- UI surfaces for Pulse, Tasks, Interventions, Profile, Focus, and Admin
- Supabase schema ready for a live backend hookup

## Next step

Set environment variables in [apps/frontend/.env.example](/Users/rithvikpraveenkumar/Repos/tsHackers-Catapult26/apps/frontend/.env.example), then run the frontend from `apps/frontend`.

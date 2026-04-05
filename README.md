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

## Purdue GenAI Studio

The live subtask breakdown pipeline can use Purdue GenAI Studio's OpenAI-compatible chat endpoint for higher-quality task decomposition.

Set these values in `apps/frontend/.env.local`:

- `PURDUE_GENAI_API_KEY`
- `PURDUE_GENAI_MODEL` (default: `llama3.1:latest`)
- `PURDUE_GENAI_BASE_URL` (default: `https://genai.rcac.purdue.edu/api`)

# Grind

## The AI that learns how you actually work — then rewrites your week before you fail.

Grind is not a productivity tracker and not a prettier to-do list. It is a personal academic operator. It learns your real effort patterns, predicts deadline failure, and intervenes before the collapse happens.

An AI planner that models the student you really are — not the student you wish you were.

## Key Features

- **Distortion Profile**: Learns where your estimates are wrong
- **Failure Predictor**: Scores each deadline by miss probability
- **Pulse Board**: Heartbeat view of semester health
- **Calendar Intervention**: Automatically creates survivable schedules
- **Start Mode**: Turns scary tasks into the smallest next step

## How It Works

Grind follows a simple, believable end-to-end loop:

1. **Ingest**: Assignments arrive from LMS/manual entry and become structured tasks.
2. **Calibrate**: Grind corrects time estimates using the user's distortion profile.
3. **Predict**: Failure Predictor flags assignments likely to slip.
4. **Intervene**: The scheduler adds or moves blocks in Google Calendar.
5. **Launch**: Start Mode turns the scary task into the smallest next step.
6. **Reflect**: Pulse Board and daily recap show semester health and what changed.

## Why This Works

1. The demo is concrete in under 20 seconds.
2. The ML story is legible and not just an LLM wrapper.
3. The interface is distinctive without being gimmicky.

## Tech Stack

- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **Database/Auth**: Supabase (Postgres)
- **ML/Intelligence**: FastAPI + scikit-learn/XGBoost + LLM API
- **Calendar**: Google Calendar API
- **LMS Ingestion**: Brightspace scrape or seeded import
- **Background Jobs**: Simple worker/cron
- **Visualization**: SVG/Canvas Pulse Board in React

## Architecture

Narrow inputs, one intelligence core, real actions, and a very small set of polished views.

## Team Roles

- **Builder A (Product + Automation)**: Data path from incoming work to calendar action
- **Builder B (UI + Experience)**: Visible product surfaces, calm and sharp
- **Builder C (ML + Intelligence)**: Models, scoring logic, and the novel story

## 24-Hour Build Workflow

- **0-4 hours**: Project shell, schema, auth, repo discipline
- **4-8 hours**: Task ingestion, Pulse Board, data logging
- **8-12 hours**: Calendar integration, task pages, train models
- **12-16 hours**: Start Mode, polish UI, risk model
- **16-20 hours**: Wire models into dashboard
- **20-24 hours**: Seed data, rehearse demo

## Demo Narrative

Show one assignment going from risky to survivable. Use one real-seeming student profile and one emotionally obvious example: a looming problem set, a crowded calendar, and a believable rescue.

## Winning Checklist

- Use one real-seeming student profile and one obvious example
- Show corrected estimate next to original estimate
- Make the intervention screen airtight with before/after changes
- Keep Pulse Board as hero visual
- Seed excellent data

## Future Scope

- Longer-term behavioral learning
- Automatic LMS ingestion
- Extensions to knowledge work beyond students

## Installation & Setup

_(To be added once the project is built)_

## Contributing

_(To be added)_

## License

_(To be added)_

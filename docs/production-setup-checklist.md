# Grind Production Setup Checklist

This checklist is for turning the current app into a real end-to-end product, with demo mode only as a fallback toggle.

## What I already set up locally

- Installed CLIs:
  - `supabase`
  - `vercel`
  - `gcloud`
  - `twilio`
- Added a production-oriented env template at `apps/frontend/.env.example`
- Added local login wrappers so CLI auth can store state inside the repo instead of your home directory:
  - `scripts/login-vercel.sh`
  - `scripts/login-gcloud.sh`
  - `scripts/login-twilio.sh`
  - `scripts/provider-status.sh`

## Phase 1: Accounts and projects

### 1. Supabase

What you need to do:

1. Create or log into your Supabase account.
2. Create one organization if you do not already have one.
3. Keep the project region close to your expected users.

What I can do next after you authenticate:

- Log in with `supabase`
- Create the project from CLI if needed
- Link this repo to the project
- Push the migration
- Generate typed DB helpers if we add that layer

CLI login path:

```bash
supabase login
```

If you prefer token-based login, create a personal access token in Supabase and give it to me or export:

```bash
export SUPABASE_ACCESS_TOKEN=...
```

### 2. Google Cloud + Calendar API

What you need to do in the Google Cloud Console:

1. Create a Google Cloud project.
2. Enable billing if the project requires it.
3. Enable `Google Calendar API`.
4. Configure the OAuth consent screen.
5. Add yourself as a test user if the app is still in testing mode.
6. Create an OAuth client for a web app.
7. Add redirect URIs:
   - Local:
     - `http://localhost:3000/api/auth/callback/google`
   - Production:
     - `https://YOUR_DOMAIN/api/auth/callback/google`
8. Add authorized JavaScript origins:
   - `http://localhost:3000`
   - `https://YOUR_DOMAIN`

What I can do after you authenticate:

- Use `gcloud` to enable APIs and inspect project config
- Wire the real OAuth config into the app
- Add calendar sync and webhook handlers

CLI login path:

```bash
./scripts/login-gcloud.sh
```

Then set the active project:

```bash
gcloud config set project YOUR_PROJECT_ID
```

### 3. Vercel

What you need to do:

1. Log into Vercel.
2. Decide on the production domain.
3. If you want Git-based deploys, connect the GitHub repo in the Vercel dashboard or let me link it via CLI after login.

What I can do after you authenticate:

- Create or link the Vercel project
- Set environment variables
- Trigger deploys
- Add cron jobs

CLI login path:

```bash
./scripts/login-vercel.sh
```

### 4. Twilio

What you need to do:

1. Create or log into Twilio.
2. Add billing.
3. Buy a phone number capable of voice.

What I can do after you authenticate:

- Configure outbound call flows
- Set webhook URLs
- Add Twilio request validation
- Wire call responses back into app state

CLI login path:

```bash
./scripts/login-twilio.sh
```

### 5. Resend

What you need to do:

1. Create or log into Resend.
2. Verify a sending domain.
3. Create an API key.

What I can do after that:

- Put the key into local/prod env
- Build the real email sender
- Add delivery status tracking

Resend does not need a dedicated CLI for the work we need right now.

## Phase 2: Secrets and environment variables

Create:

- `apps/frontend/.env.local`

Start from:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_MODE=live
DEMO_MODE=false

AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_CALENDAR_WEBHOOK_SECRET=

OPENAI_API_KEY=

RESEND_API_KEY=
RESEND_FROM_EMAIL=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_WEBHOOK_SECRET=
```

## Phase 3: Order of implementation

1. Real auth with Google
2. Real Supabase persistence
3. Replace in-memory repository with DB repository
4. Calendar connect + sync
5. Real normalization + subtask generation
6. Risk/profile/intervention persistence
7. Focus session persistence
8. Real email
9. Real voice
10. Vercel deployment
11. Small demo toggle only

## Phase 4: What I can automate once logins exist

- Supabase:
  - link project
  - run/push migrations
  - inspect project refs
- Google Cloud:
  - set active project
  - enable APIs
  - inspect config
- Vercel:
  - link project
  - pull env
  - deploy
- Twilio:
  - inspect account state
  - configure CLI-backed flows

## Phase 5: Commands to run with me

Check tool and login status:

```bash
./scripts/provider-status.sh
```

Supabase login:

```bash
supabase login
```

Google login:

```bash
./scripts/login-gcloud.sh
```

Vercel login:

```bash
./scripts/login-vercel.sh
```

Twilio login:

```bash
./scripts/login-twilio.sh
```

## Remaining manual dashboard work I cannot fully eliminate

- Google OAuth consent screen setup
- Google OAuth client creation and redirect URI entry
- Resend domain verification
- Twilio billing + phone number purchase
- Any billing activation / organization ownership approvals

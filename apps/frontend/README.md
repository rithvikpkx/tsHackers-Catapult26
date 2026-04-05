# Frontend

React app shell for the Pulse Board, Tasks, Intervention, and Start Mode surfaces.

## Google onboarding setup

Create a `.env.local` file with:

```bash
REACT_APP_BACKEND_URL=http://127.0.0.1:8000
REACT_APP_GOOGLE_CLIENT_ID=your-google-oauth-web-client-id.apps.googleusercontent.com
REACT_APP_GOOGLE_ONBOARDING_ENDPOINT=/api/onboarding/google-import
```

Google scopes requested by the frontend:

- `openid email profile`
- `https://www.googleapis.com/auth/calendar.readonly`
- `https://www.googleapis.com/auth/classroom.courses.readonly`
- `https://www.googleapis.com/auth/classroom.rosters.readonly`

## Backend contract (current frontend expectation)

`POST {REACT_APP_BACKEND_URL}{REACT_APP_GOOGLE_ONBOARDING_ENDPOINT}`

Request body:

```json
{
  "accessToken": "google-oauth-access-token",
  "scopes": ["openid", "email", "profile", "..."],
  "googleUser": {
    "id": "google-sub",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "fullName": "Ada Lovelace",
    "email": "ada@purdue.edu",
    "picture": "https://..."
  }
}
```

Response fields used by the dashboard:

- `summary`
- `tasks`
- `distortion`
- `intervention`
- `metrics`
- `restingRate`
- `classes` (Google Classroom classes)
- `user` (optional normalized profile override)

## Commands

```bash
npm install
npm run dev
npm run build
```


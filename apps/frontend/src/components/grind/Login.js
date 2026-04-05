import { useEffect, useMemo, useState } from "react";
import "./Login.css";

const GOOGLE_IDENTITY_SCRIPT_URL = "https://accounts.google.com/gsi/client";
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.rosters.readonly",
];

function normalizeGoogleUser(profile = {}) {
  return {
    id: profile.sub || "",
    firstName: profile.given_name || "",
    lastName: profile.family_name || "",
    fullName: profile.name || "",
    email: profile.email || "",
    picture: profile.picture || "",
  };
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById("google-identity-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google Sign-In.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "google-identity-script";
    script.src = GOOGLE_IDENTITY_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Sign-In."));
    document.head.appendChild(script);
  });
}

function requestGoogleAccessToken(scopeList) {
  return new Promise((resolve, reject) => {
    const oauthClient = window.google?.accounts?.oauth2;
    if (!oauthClient) {
      reject(new Error("Google Sign-In has not loaded yet."));
      return;
    }

    const tokenClient = oauthClient.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: scopeList,
      prompt: "consent",
      callback: (tokenResponse) => {
        if (tokenResponse?.error) {
          reject(new Error(tokenResponse.error_description || tokenResponse.error));
          return;
        }
        resolve(tokenResponse);
      },
      error_callback: () => reject(new Error("Google sign-in did not complete.")),
    });

    tokenClient.requestAccessToken();
  });
}

async function fetchGoogleUser(accessToken) {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Unable to read your Google profile right now.");
  }

  const profile = await response.json();
  return normalizeGoogleUser(profile);
}

export default function Login({ onLogin, busy = false }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const isSubmitting = busy || submitting;
  const scopeList = useMemo(() => GOOGLE_SCOPES.join(" "), []);

  useEffect(() => {
    let ignore = false;

    if (!GOOGLE_CLIENT_ID) return undefined;

    loadGoogleIdentityScript()
      .then(() => {
        if (!ignore) {
          setGoogleReady(Boolean(window.google?.accounts?.oauth2));
        }
      })
      .catch((loadError) => {
        if (!ignore) {
          setError(loadError?.message || "Failed to initialize Google Sign-In.");
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function handleGoogleLogin() {
    setError("");

    if (!GOOGLE_CLIENT_ID) {
      setError("Missing REACT_APP_GOOGLE_CLIENT_ID in frontend environment.");
      return;
    }

    setSubmitting(true);
    try {
      const tokenResponse = await requestGoogleAccessToken(scopeList);
      const accessToken = tokenResponse?.access_token;
      if (!accessToken) {
        throw new Error("Google did not return an access token.");
      }

      const googleUser = await fetchGoogleUser(accessToken);
      await onLogin({
        accessToken,
        scopes: (tokenResponse?.scope || scopeList).split(" ").filter(Boolean),
        googleUser,
      });
    } catch (loginError) {
      setError(loginError?.message || "Unable to connect your Google account right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-dot" />
          <span className="login-brand">GRIND</span>
        </div>
        <h1 className="login-title">Know yourself.<br />Beat the semester.</h1>
        <p className="login-sub">Sign in with Google to sync calendar and classroom data.</p>

        <div className="login-permissions">
          <div className="login-permissions-title">This will connect:</div>
          <ul>
            <li>Google Calendar (read-only)</li>
            <li>Google Classroom courses (read-only)</li>
            <li>Google Classroom rosters (read-only)</li>
          </ul>
        </div>

        {error && <p className="login-error">{error}</p>}
        {!GOOGLE_CLIENT_ID && (
          <p className="login-hint">Set REACT_APP_GOOGLE_CLIENT_ID to enable Google sign-in.</p>
        )}

        <button
          type="button"
          className="login-submit google-submit"
          disabled={isSubmitting || !googleReady || !GOOGLE_CLIENT_ID}
          onClick={handleGoogleLogin}
        >
          <span className="google-mark">G</span>
          {isSubmitting ? "Connecting Google..." : "Continue with Google"}
        </button>
      </div>
    </div>
  );
}

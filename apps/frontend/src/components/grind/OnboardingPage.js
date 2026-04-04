import { useState } from "react";

function fmt(isoValue) {
  return new Date(isoValue).toLocaleString();
}

export default function OnboardingPage({
  user,
  calendar,
  hasTasks,
  actionBusy,
  onConnectCalendar,
  onImportBrightspace,
  onSyncCalendar,
  onContinue,
}) {
  const [feedUrl, setFeedUrl] = useState("");
  const status = calendar?.status || {};
  const connected = Boolean(status.connected);
  const oauthConfigured = Boolean(status.oauth_configured);
  const blocks = calendar?.blocks || [];
  const previewBlocks = blocks.slice(0, 3);

  return (
    <div className="main">
      <div className="onboarding-shell">
        <div className="onboarding-hero">
          <div className="card-label">First run</div>
          <h1>
            Let&apos;s map your real week first, {user.firstName}.
          </h1>
          <p>
            Grind should start from your actual schedule and deadlines, not random seeded tasks. Connect Google
            Calendar or import your Brightspace calendar feed, then let Grind build the dashboard from there.
          </p>
        </div>

        <div className="onboarding-grid">
          <div className="card onboarding-card">
            <div className="onboarding-step">Step 1</div>
            <h2>Connect Google Calendar</h2>
            <p>
              We use your busy blocks to understand where focus time can actually fit before any intervention is
              proposed.
            </p>

            {!oauthConfigured && (
              <div className="onboarding-warning">
                Google OAuth is not configured on this machine yet. Add `GOOGLE_CLIENT_ID` and
                `GOOGLE_CLIENT_SECRET` in `services/backend/.env`, then try again.
              </div>
            )}

            {connected ? (
              <div className="onboarding-success">
                Connected to {status.provider_user_email || "your Google account"}.
              </div>
            ) : (
              <button
                className="topbar-pill topbar-pill-primary"
                onClick={onConnectCalendar}
                disabled={actionBusy || !oauthConfigured}
              >
                Connect Google Calendar
              </button>
            )}
          </div>

          <div className="card onboarding-card">
            <div className="onboarding-step">Step 1B</div>
            <h2>Or import Brightspace calendar feed</h2>
            <p>
              Paste your Brightspace `.ics` calendar URL and Grind will turn the feed into real tasks without
              loading seeded demo data.
            </p>

            <textarea
              className="onboarding-input"
              value={feedUrl}
              onChange={(event) => setFeedUrl(event.target.value)}
              placeholder="Paste your Brightspace calendar feed URL here"
              rows={4}
            />

            <button
              className="topbar-pill"
              onClick={() => onImportBrightspace(feedUrl)}
              disabled={actionBusy || !feedUrl.trim()}
            >
              Import Brightspace feed
            </button>
          </div>

          <div className="card onboarding-card">
            <div className="onboarding-step">Step 2</div>
            <h2>Analyze the next 7 days</h2>
            <p>
              Once the calendar is connected, sync it here and Grind will summarize the pressure points in your
              week. If you imported Brightspace instead, your dashboard will stay task-first until you add a real
              schedule source.
            </p>

            <div className="onboarding-stats">
              <div className="onboarding-stat">
                <span>Busy blocks</span>
                <strong>{blocks.length}</strong>
              </div>
              <div className="onboarding-stat">
                <span>Busy hours</span>
                <strong>{(calendar?.totalBusyHours || 0).toFixed(1)}h</strong>
              </div>
            </div>

            <button className="topbar-pill" onClick={onSyncCalendar} disabled={actionBusy || !connected}>
              Sync and analyze calendar
            </button>

            {previewBlocks.length > 0 && (
              <div className="onboarding-preview">
                <div className="card-label">Upcoming</div>
                {previewBlocks.map((block, index) => (
                  <div key={`${block.label}-${index}`} className="onboarding-preview-row">
                    <strong>{block.label}</strong>
                    <span>{fmt(block.start)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card onboarding-footer">
          <div>
            <div className="onboarding-step">What happens next</div>
            <p>
              After Google Calendar sync or Brightspace import, you can continue into the dashboard. If there are
              still no tasks yet, the workspace stays clean until you add or ingest them.
            </p>
          </div>
          <button className="topbar-pill" onClick={onContinue} disabled={!connected && !hasTasks}>
            Continue to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

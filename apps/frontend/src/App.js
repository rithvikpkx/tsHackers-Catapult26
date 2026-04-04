import { useEffect, useState } from "react";
import Login from "./components/grind/Login";
import TopBar from "./components/grind/TopBar";
import Sidebar from "./components/grind/Sidebar";
import MetricCards from "./components/grind/MetricCards";
import PulseChart from "./components/grind/PulseChart";
import TaskList from "./components/grind/TaskList";
import DistortionPanel from "./components/grind/DistortionPanel";
import InterventionCard from "./components/grind/InterventionCard";
import InterventionPage from "./components/grind/InterventionPage";
import UpdatedSchedulePage from "./components/grind/UpdatedSchedulePage";
import StartModePage from "./components/grind/StartModePage";
import OnboardingPage from "./components/grind/OnboardingPage";
import "./components/grind/grind.css";
import "./components/grind/UpdatedSchedule.css";
import "./components/grind/DesignSystem.css";
import "./components/grind/polish.css";

import {
  createFocusBlock,
  importBrightspaceFeed,
  loadDashboardPayload,
  logTaskEvent,
  startCalendarConnection,
  updateTaskStatus,
} from "./lib/backendApi";

function StatusBanner({ tone = "info", text }) {
  if (!text) return null;
  return <div className={`status-banner ${tone}`}>{text}</div>;
}

function CalendarCard({ calendar, onConnect, onRefresh, actionBusy }) {
  const connected = calendar?.status?.connected;
  const email = calendar?.status?.provider_user_email;
  const busyHours = (calendar?.totalBusyHours || 0).toFixed(1);

  return (
    <div className="card calendar-card">
      <div className="calendar-card-top">
        <div>
          <div className="card-label">Google Calendar</div>
          <div className="calendar-title">{connected ? "Connected schedule" : "Connect your schedule"}</div>
        </div>
        <span className={`badge ${connected ? "low" : "medium"}`}>{connected ? "Live" : "Pending"}</span>
      </div>
      <p className="calendar-copy">
        {connected
          ? `${email || "Primary calendar"} synced with ${busyHours} busy hours over the next week.`
          : "Use Google Calendar as the first live integration so Grind can plan around your real week."}
      </p>
      <div className="calendar-actions">
        <button className="topbar-pill" onClick={connected ? onRefresh : onConnect} disabled={actionBusy}>
          {connected ? "Sync now" : "Connect Google"}
        </button>
      </div>
    </div>
  );
}

function EmptyWorkspaceCard() {
  return (
    <div className="card empty-workspace-card">
      <div className="card-label">No tasks yet</div>
      <div className="calendar-title">Your workspace is intentionally empty.</div>
      <p className="calendar-copy">
        Grind will stay clean until you ingest or add tasks. Right now it can still learn your weekly shape from
        your calendar and prepare the schedule layer first.
      </p>
    </div>
  );
}

function Dashboard({
  user,
  onNavigate,
  payload,
  loading,
  onConnectCalendar,
  onSyncCalendar,
  actionBusy,
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="main">
      <div className="greeting">
        <h1>
          {greeting}, {user.firstName}
        </h1>
        <p>
          {loading
            ? "Loading live backend values..."
            : `Resting rate ${payload.summary.resting_rate}. ${payload.metrics.atRiskCount} tasks need attention this week.`}
        </p>
      </div>
      <CalendarCard
        calendar={payload.calendar}
        onConnect={onConnectCalendar}
        onRefresh={onSyncCalendar}
        actionBusy={actionBusy}
      />
      {payload.allTasks.length === 0 ? (
        <EmptyWorkspaceCard />
      ) : (
        <>
          <MetricCards metrics={payload.metrics} />
          <PulseChart restingRate={payload.summary.resting_rate} />
          <div className="two-col">
            <TaskList tasks={payload.tasks} onSelect={() => onNavigate("intervention")} />
            <DistortionPanel insights={payload.distortion} />
          </div>
          <InterventionCard intervention={payload.interventionCard} onOpen={() => onNavigate("intervention")} />
        </>
      )}
    </div>
  );
}

function TasksPage({ tasks, onOpenStart }) {
  return (
    <div className="main">
      <div className="greeting">
        <h1>Tasks</h1>
        <p>Your current task stack ranked by failure risk.</p>
      </div>
      <TaskList tasks={tasks} onSelect={onOpenStart} />
    </div>
  );
}

const EMPTY_PAYLOAD = {
  summary: { resting_rate: 68, health_label: "Stable" },
  metrics: {
    healthScore: 74,
    healthLabel: "Stable",
    atRiskCount: 0,
    distortionMultiplier: 1.0,
    calendarHours: "0.0",
  },
  tasks: [],
  allTasks: [],
  rawTasks: [],
  distortion: [],
  interventionCard: {
    probBefore: 45,
    probAfter: 62,
    description: "Grind is loading your current task and calendar state.",
  },
  interventionPlan: null,
  hotTask: null,
  updatedScheduleData: null,
  calendar: {
    status: { connected: false, provider: "google" },
    blocks: [],
    totalBusyHours: 0,
  },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebar] = useState(false);
  const [page, setPage] = useState("onboarding");
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState("");
  const [payload, setPayload] = useState(EMPTY_PAYLOAD);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const needsInitialOnboarding = !payload.calendar?.status?.connected && payload.allTasks.length === 0;

  async function refreshPayload(showSpinner = false) {
    if (showSpinner) setLoading(true);
    setError("");
    try {
      const nextPayload = await loadDashboardPayload();
      setPayload(nextPayload);
      return nextPayload;
    } catch (err) {
      setError(err.message || "Failed to load the backend pipeline.");
      throw err;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const calendarStatus = params.get("calendar");
    if (calendarStatus === "connected") {
      setNotice("Google Calendar connected. Grind is pulling your next 7 days of schedule now.");
      setPage("onboarding");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (calendarStatus === "error") {
      setError("Google Calendar connection did not complete. Try the connect flow again.");
      window.history.replaceState({}, "", window.location.pathname);
    }
    refreshPayload(true).catch(() => null);
  }, []);

  if (!user) return <Login onLogin={setUser} />;

  async function runAction(actionName, work, successMessage, nextPage) {
    setActionBusy(actionName);
    setError("");
    try {
      await work();
      await refreshPayload(false);
      if (successMessage) setNotice(successMessage);
      if (nextPage) setPage(nextPage);
    } catch (err) {
      setError(err.message || "That action did not complete.");
    } finally {
      setActionBusy("");
    }
  }

  async function handleConnectCalendar() {
    setError("");
    try {
      const payload = await startCalendarConnection();
      window.location.href = payload.auth_url;
    } catch (err) {
      setError(err.message || "Google Calendar connection is not configured yet.");
    }
  }

  function handleSyncCalendar() {
    setActionBusy("sync");
    setError("");
    setNotice("");
    return refreshPayload(true)
      .then(() => setNotice("Schedule refreshed from the backend."))
      .catch((err) => setError(err.message || "Failed to refresh the schedule."))
      .finally(() => setActionBusy(""));
  }

  function handleImportBrightspace(feedUrl) {
    return runAction(
      "brightspace-import",
      () => importBrightspaceFeed(feedUrl),
      "Brightspace calendar imported. Grind now has your real task dates instead of seeded data.",
      "dashboard"
    );
  }

  function handleAcceptPlan() {
    if (!payload.calendar?.status?.connected) {
      return handleConnectCalendar();
    }
    return runAction(
      "focus-block",
      () => createFocusBlock(payload.interventionPlan, payload.hotTask),
      "Focus block protected in Google Calendar.",
      "schedule"
    );
  }

  function handleStartTask() {
    if (!payload.hotTask) return;
    return runAction(
      "task-start",
      async () => {
        await updateTaskStatus(payload.hotTask.id, "in_progress");
        await logTaskEvent("task_started", payload.hotTask.id);
      },
      "Task marked in progress and your risk profile was reweighted.",
      "start"
    );
  }

  function handleCompleteFocusBlock() {
    if (!payload.hotTask) return;
    return runAction(
      "focus-complete",
      () => logTaskEvent("focus_block_completed", payload.hotTask.id),
      "Focus block completion recorded. Grind reweighted your open tasks.",
      "start"
    );
  }

  function handleCompleteTask() {
    if (!payload.hotTask) return;
    return runAction(
      "task-complete",
      async () => {
        await updateTaskStatus(payload.hotTask.id, "done");
        await logTaskEvent("task_completed", payload.hotTask.id);
      },
      "Task completed. Grind updated the rest of your stack.",
      "dashboard"
    );
  }

  function renderPage() {
    switch (page) {
      case "onboarding":
        return (
          <OnboardingPage
            user={user}
            calendar={payload.calendar}
            hasTasks={payload.allTasks.length > 0}
            actionBusy={Boolean(actionBusy)}
            onConnectCalendar={handleConnectCalendar}
            onImportBrightspace={handleImportBrightspace}
            onSyncCalendar={handleSyncCalendar}
            onContinue={() => setPage("dashboard")}
          />
        );
      case "dashboard":
        return (
          <Dashboard
            user={user}
            onNavigate={setPage}
            payload={payload}
            loading={loading}
            onConnectCalendar={handleConnectCalendar}
            onSyncCalendar={handleSyncCalendar}
            actionBusy={Boolean(actionBusy)}
          />
        );
      case "tasks":
        return <TasksPage tasks={payload.allTasks} onOpenStart={() => setPage("start")} />;
      case "schedule":
        return (
          <UpdatedSchedulePage
            interventionData={payload.updatedScheduleData}
            loading={loading}
            onAccept={handleAcceptPlan}
            acceptLabel={payload.calendar?.status?.connected ? "Protect focus block" : "Connect Google Calendar"}
            actionBusy={Boolean(actionBusy)}
          />
        );
      case "intervention":
        return (
          <InterventionPage
            plan={payload.interventionPlan}
            hotTask={payload.hotTask}
            loading={loading}
            onOpenStart={() => setPage("start")}
            onAcceptPlan={handleAcceptPlan}
            calendarConnected={payload.calendar?.status?.connected}
            actionBusy={Boolean(actionBusy)}
          />
        );
      case "start":
        return (
          <StartModePage
            hotTask={payload.hotTask}
            plan={payload.interventionPlan}
            loading={loading}
            actionBusy={Boolean(actionBusy)}
            onStartTask={handleStartTask}
            onCompleteFocusBlock={handleCompleteFocusBlock}
            onCompleteTask={handleCompleteTask}
          />
        );
      default:
        return (
          <div className="main">
            <div className="card">
              <div className="card-label">Page</div>
              <div className="start-title">This page is not available yet.</div>
            </div>
          </div>
        );
    }
  }

  return (
    <div className="grind-app">
      {!needsInitialOnboarding && (
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebar(false)}
          currentPage={page}
          onNavigate={setPage}
          user={user}
        />
      )}
      <TopBar
        onMenuClick={() => (needsInitialOnboarding ? setPage("onboarding") : setSidebar(true))}
        onSyncCalendar={handleSyncCalendar}
        onOpenStartMode={() => setPage(needsInitialOnboarding ? "onboarding" : "start")}
        calendarConnected={payload.calendar?.status?.connected}
        actionBusy={Boolean(actionBusy)}
        showMenu={!needsInitialOnboarding}
        showStartAction={!needsInitialOnboarding}
        calendarActionLabel={needsInitialOnboarding ? "Refresh status" : undefined}
      />
      <div className="main-shell">
        <StatusBanner tone="success" text={notice} />
        <StatusBanner tone="error" text={error} />
        {renderPage()}
      </div>
    </div>
  );
}

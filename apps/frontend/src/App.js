import { useState } from "react";
import Login from "./components/grind/Login";
import TopBar from "./components/grind/TopBar";
import Sidebar from "./components/grind/Sidebar";
import PulseChart from "./components/grind/PulseChart";
import TaskList from "./components/grind/TaskList";
import InterventionCard from "./components/grind/InterventionCard";
import InterventionPage from "./components/grind/InterventionPage";
import UpdatedSchedulePage from "./components/grind/UpdatedSchedulePage";
import "./components/grind/grind.css";
import "./components/grind/UpdatedSchedule.css";
import "./components/grind/DesignSystem.css";
import "./components/grind/polish.css";

import { DEMO_TASKS, DEMO_DISTORTION, DEMO_INTERVENTION, DEMO_METRICS } from "./lib/demoData";

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
const GOOGLE_ONBOARDING_ENDPOINT = process.env.REACT_APP_GOOGLE_ONBOARDING_ENDPOINT || "/api/onboarding/google-import";
const GOOGLE_CALENDAR_LIST_ENDPOINT = "https://www.googleapis.com/calendar/v3/users/me/calendarList";
const GOOGLE_CALENDAR_BASE_ENDPOINT = "https://www.googleapis.com/calendar/v3/calendars";
const MAX_CALENDAR_TASKS = 5;
const CALENDAR_PAST_WINDOW_DAYS = 30;
const CALENDAR_FUTURE_WINDOW_DAYS = 120;

function buildBackendUrl(path) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${BACKEND_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function normalizeUserProfile(profile = {}) {
  const fullNameFromProfile = profile.fullName || profile.name || "";
  const fullNameParts = fullNameFromProfile.trim().split(/\s+/).filter(Boolean);
  const firstName = profile.firstName || profile.given_name || fullNameParts[0] || "Student";
  const lastName = profile.lastName || profile.family_name || fullNameParts.slice(1).join(" ");

  return {
    id: profile.id || profile.sub || "",
    firstName,
    lastName,
    fullName: `${firstName}${lastName ? ` ${lastName}` : ""}`.trim(),
    email: profile.email || "",
    picture: profile.picture || "",
    gradeYear: profile.gradeYear || "",
  };
}

function formatRelativeDue(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Upcoming";

  const now = Date.now();
  const diffMs = date.getTime() - now;
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < -24) return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} ago`;
  if (diffHours < 0) return "Earlier today";
  if (diffHours <= 6) return "Starting soon";
  if (diffHours < 24) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays < 7) return `Due in ${diffDays} days`;
  return `Due ${date.toLocaleDateString()}`;
}

function getTaskPriorityFromDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return { dot: "gray", badge: "low", label: "Soon" };
  }

  const diffHours = Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60));
  if (diffHours < 0) return { dot: "gray", badge: "low", label: "Recent" };
  if (diffHours <= 6) return { dot: "red", badge: "high", label: "Soon" };
  if (diffHours <= 24) return { dot: "amber", badge: "medium", label: "24h" };
  return { dot: "green", badge: "low", label: "Planned" };
}

function eventStartDate(event) {
  return event?.start?.dateTime || event?.start?.date || null;
}

function mapEventToTask(event, index) {
  const start = eventStartDate(event);
  const priority = getTaskPriorityFromDate(start);
  const dueSubtitle = formatRelativeDue(start);

  return {
    id: `gcal-${event.id || index}`,
    name: event.summary || "Untitled calendar event",
    subtitle: `${dueSubtitle} · Google Calendar`,
    dot: priority.dot,
    badge: priority.badge,
    label: priority.label,
  };
}

function getFutureWindowIso(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function getPastWindowIso(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function eventComparableDate(event) {
  const start = eventStartDate(event);
  const parsed = new Date(start);
  return Number.isNaN(parsed.getTime()) ? Number.POSITIVE_INFINITY : parsed.getTime();
}

async function fetchCalendarIds(accessToken) {
  const response = await fetch(`${GOOGLE_CALENDAR_LIST_ENDPOINT}?minAccessRole=reader&showHidden=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Unable to list your Google calendars (${response.status}).`);
  }

  const payload = await response.json().catch(() => ({}));
  const items = Array.isArray(payload.items) ? payload.items : [];
  const calendarIds = items
    .filter((cal) => cal?.id && !cal?.deleted)
    .map((cal) => cal.id);

  return calendarIds.length ? calendarIds : ["primary"];
}

async function fetchEventsForCalendar(accessToken, calendarId) {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: getPastWindowIso(CALENDAR_PAST_WINDOW_DAYS),
    timeMax: getFutureWindowIso(CALENDAR_FUTURE_WINDOW_DAYS),
    maxResults: "50",
    showDeleted: "false",
  });
  const encodedCalendarId = encodeURIComponent(calendarId);
  const response = await fetch(`${GOOGLE_CALENDAR_BASE_ENDPOINT}/${encodedCalendarId}/events?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return {
      calendarId,
      items: [],
      error: `events(${calendarId}) -> ${response.status}`,
    };
  }

  const payload = await response.json().catch(() => ({}));
  return {
    calendarId,
    items: Array.isArray(payload.items) ? payload.items : [],
    error: "",
  };
}

async function fetchUpcomingCalendarTasks(accessToken) {
  if (!accessToken) return [];

  const results = [];
  results.push(await fetchEventsForCalendar(accessToken, "primary"));

  let calendarIds = ["primary"];
  try {
    calendarIds = await fetchCalendarIds(accessToken);
  } catch (calendarListError) {
    console.error("Google calendar list fetch failed:", calendarListError);
  }

  const additionalCalendarIds = calendarIds.filter((id) => id !== "primary").slice(0, 11);
  if (additionalCalendarIds.length) {
    const extraResults = await Promise.all(
      additionalCalendarIds.map((calendarId) => fetchEventsForCalendar(accessToken, calendarId))
    );
    results.push(...extraResults);
  }

  const events = results.flatMap((result) => result.items || []);
  if (!events.length) {
    const errorDetails = results.map((result) => result.error).filter(Boolean).join(", ");
    if (errorDetails) {
      throw new Error(`Calendar sync failed: ${errorDetails}`);
    }
  }

  const seen = new Set();

  return events
    .filter((event) => {
      if (event?.status === "cancelled" || !eventStartDate(event)) return false;
      const dedupeKey = `${event.id || ""}-${eventStartDate(event) || ""}`;
      if (seen.has(dedupeKey)) return false;
      seen.add(dedupeKey);
      return true;
    })
    .sort((a, b) => Math.abs(eventComparableDate(a) - Date.now()) - Math.abs(eventComparableDate(b) - Date.now()))
    .slice(0, MAX_CALENDAR_TASKS)
    .map(mapEventToTask);
}

const DEFAULT_DASHBOARD = {
  summary: "Your semester health is stable. Two tasks need attention tonight.",
  tasks: DEMO_TASKS,
  distortion: DEMO_DISTORTION,
  intervention: DEMO_INTERVENTION,
  metrics: DEMO_METRICS,
  restingRate: 68,
  classes: [],
};

function Dashboard({ user, onNavigate, data, onFinishTask }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user.firstName || user.fullName || "Student";
  const classCount = Array.isArray(data.classes) ? data.classes.length : 0;
  const completedToday = Array.isArray(data.tasks)
    ? data.tasks.filter((task) => task?.completed || task?.done || task?.status === "done").length
    : 0;
  const totalToday = Array.isArray(data.tasks) ? data.tasks.length : 0;
  const taskLabel = Array.isArray(data.tasks) && data.tasks.some((task) => String(task.id || "").startsWith("gcal-"))
    ? "Upcoming from Google Calendar"
    : "Today";

  return (
    <div className="main">
      <div className="greeting">
        <h1>{greeting}, {firstName}</h1>
        <p>{data.summary}</p>
        {classCount > 0 && (
          <p>Synced {classCount} Google Classroom {classCount === 1 ? "class" : "classes"}.</p>
        )}
      </div>
      <PulseChart completedToday={completedToday} totalToday={totalToday} />
      <TaskList tasks={data.tasks} label={taskLabel} onFinishTask={onFinishTask} />
      <InterventionCard intervention={data.intervention} onOpen={() => onNavigate("intervention")} />
    </div>
  );
}

function PlaceholderPage({ title }) {
  return (
    <div className="main">
      <div className="greeting">
        <h1>{title}</h1>
        <p>This page is coming soon.</p>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser]         = useState(null);
  const [sidebarOpen, setSidebar] = useState(false);
  const [page, setPage]         = useState("dashboard");
  const [dashboardData, setDashboardData] = useState(DEFAULT_DASHBOARD);
  const [loginBusy, setLoginBusy] = useState(false);

  function handleFinishTask(taskId) {
    setDashboardData((prev) => ({
      ...prev,
      tasks: (Array.isArray(prev.tasks) ? prev.tasks : []).map((task) =>
        task.id === taskId ? { ...task, completed: true, status: "done" } : task
      ),
    }));
  }

  async function syncCalendarTasks(accessToken, fallbackTasks = DEFAULT_DASHBOARD.tasks) {
    try {
      const calendarTasks = await fetchUpcomingCalendarTasks(accessToken);
      if (!calendarTasks.length) {
        setDashboardData((prev) => ({
          ...prev,
          summary: "Connected to Google, but no events were found in your recent/upcoming window.",
          tasks: [],
        }));
        return;
      }

      setDashboardData((prev) => {
        return {
          ...prev,
          summary: `Loaded ${calendarTasks.length} recent/upcoming Google Calendar ${calendarTasks.length === 1 ? "event" : "events"}.`,
          tasks: calendarTasks.slice(0, MAX_CALENDAR_TASKS),
        };
      });
    } catch (syncError) {
      console.error("Google Calendar sync failed:", syncError);
      setDashboardData((prev) => ({
        ...prev,
        summary: syncError?.message || "Connected to Google, but calendar sync failed.",
        tasks: Array.isArray(prev.tasks) ? prev.tasks.filter((task) => String(task.id || "").startsWith("gcal-")) : [],
      }));
    }
  }

  async function handleLogin(authPayload) {
    setLoginBusy(true);
    const fallbackUser = normalizeUserProfile(authPayload?.googleUser || {});
    let dashboardBase = DEFAULT_DASHBOARD;

    try {
      const response = await fetch(buildBackendUrl(GOOGLE_ONBOARDING_ENDPOINT), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authPayload),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        dashboardBase = {
          summary: payload.summary || DEFAULT_DASHBOARD.summary,
          tasks: Array.isArray(payload.tasks) && payload.tasks.length ? payload.tasks : DEFAULT_DASHBOARD.tasks,
          distortion: Array.isArray(payload.distortion) && payload.distortion.length ? payload.distortion : DEFAULT_DASHBOARD.distortion,
          intervention: payload.intervention || DEFAULT_DASHBOARD.intervention,
          metrics: payload.metrics || DEFAULT_DASHBOARD.metrics,
          restingRate: Number.isFinite(payload.restingRate) ? payload.restingRate : DEFAULT_DASHBOARD.restingRate,
          classes: Array.isArray(payload.classes) ? payload.classes : DEFAULT_DASHBOARD.classes,
        };
      } else if (response.status !== 404) {
        dashboardBase = {
          ...DEFAULT_DASHBOARD,
          summary: payload?.detail || "Connected to Google. Backend onboarding is unavailable, using direct calendar sync.",
        };
      }
    } catch (_error) {
      dashboardBase = {
        ...DEFAULT_DASHBOARD,
        summary: "Connected to Google. Backend unreachable, using direct calendar sync.",
      };
    }

    try {
      setDashboardData(dashboardBase);
      setUser(fallbackUser);
      await syncCalendarTasks(authPayload?.accessToken, dashboardBase.tasks || DEFAULT_DASHBOARD.tasks);
    } finally {
      setLoginBusy(false);
    }
  }

  if (!user) return <Login onLogin={handleLogin} busy={loginBusy} />;

  function renderPage() {
    switch (page) {
      case "dashboard":    return <Dashboard user={user} onNavigate={setPage} data={dashboardData} onFinishTask={handleFinishTask} />;
      case "schedule":     return <UpdatedSchedulePage />;
      case "intervention": return <InterventionPage />;
      default:                  return <PlaceholderPage title={page.charAt(0).toUpperCase() + page.slice(1)} />;
    }
  }

  return (
    <div className="grind-app">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebar(false)}
        currentPage={page}
        onNavigate={setPage}
        user={user}
      />
      <TopBar onMenuClick={() => setSidebar(true)} />
      {renderPage()}
    </div>
  );
}

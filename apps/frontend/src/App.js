import { useState } from "react";
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
import "./components/grind/grind.css";
import "./components/grind/UpdatedSchedule.css";
import "./components/grind/DesignSystem.css";
import "./components/grind/polish.css";

import { DEMO_TASKS, DEMO_DISTORTION, DEMO_INTERVENTION, DEMO_METRICS } from "./lib/demoData";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";

const DEFAULT_DASHBOARD = {
  summary: "Your semester health is stable. Two tasks need attention tonight.",
  tasks: DEMO_TASKS,
  distortion: DEMO_DISTORTION,
  intervention: DEMO_INTERVENTION,
  metrics: DEMO_METRICS,
  restingRate: 68,
};

function Dashboard({ user, onNavigate, data }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="main">
      <div className="greeting">
        <h1>{greeting}, {user.firstName}</h1>
        <p>{data.summary}</p>
      </div>
      <MetricCards metrics={data.metrics} />
      <PulseChart restingRate={data.restingRate} />
      <div className="two-col">
        <TaskList tasks={data.tasks} />
        <DistortionPanel insights={data.distortion} />
      </div>
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

  async function handleLogin(form) {
    setLoginBusy(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/onboarding/brightspace-import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.detail || "Unable to import the Brightspace calendar right now.");
      }

      setDashboardData({
        summary: payload.summary || DEFAULT_DASHBOARD.summary,
        tasks: Array.isArray(payload.tasks) && payload.tasks.length ? payload.tasks : DEFAULT_DASHBOARD.tasks,
        distortion: Array.isArray(payload.distortion) && payload.distortion.length ? payload.distortion : DEFAULT_DASHBOARD.distortion,
        intervention: payload.intervention || DEFAULT_DASHBOARD.intervention,
        metrics: payload.metrics || DEFAULT_DASHBOARD.metrics,
        restingRate: Number.isFinite(payload.restingRate) ? payload.restingRate : DEFAULT_DASHBOARD.restingRate,
      });
      setUser(form);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to import the Brightspace calendar right now.";
      throw new Error(message);
    } finally {
      setLoginBusy(false);
    }
  }

  if (!user) return <Login onLogin={handleLogin} busy={loginBusy} />;

  function renderPage() {
    switch (page) {
      case "dashboard":    return <Dashboard user={user} onNavigate={setPage} data={dashboardData} />;
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

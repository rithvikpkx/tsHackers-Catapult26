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
import "./components/grind/grind.css";
import "./components/grind/UpdatedSchedule.css";
import "./components/grind/DesignSystem.css";
import "./components/grind/polish.css";

import { loadDashboardPayload } from "./lib/backendApi";

function Dashboard({ user, onNavigate, payload, loading }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="main">
      <div className="greeting">
        <h1>{greeting}, {user.firstName}</h1>
        <p>
          {loading
            ? "Loading backend values..."
            : `Resting rate ${payload.summary.resting_rate}. ${payload.metrics.atRiskCount} tasks need attention tonight.`}
        </p>
      </div>
      <MetricCards metrics={payload.metrics} />
      <PulseChart restingRate={payload.summary.resting_rate} />
      <div className="two-col">
        <TaskList tasks={payload.tasks} />
        <DistortionPanel insights={payload.distortion} />
      </div>
      <InterventionCard intervention={payload.interventionCard} onOpen={() => onNavigate("intervention")} />
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
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState({
    summary: { resting_rate: 68 },
    metrics: { healthScore: 74, healthLabel: "Stable", atRiskCount: 0, distortionMultiplier: 2.1 },
    tasks: [],
    distortion: [],
    interventionCard: {
      probBefore: 22,
      probAfter: 91,
      description: "Waiting for backend pipeline values...",
    },
    interventionPlan: null,
    hotTask: null,
    updatedScheduleData: null,
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const nextPayload = await loadDashboardPayload();
        if (mounted) setPayload(nextPayload);
      } catch {
        // Keep UI alive with fallback values during hackathon demo prep.
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (!user) return <Login onLogin={setUser} />;

  function renderPage() {
    switch (page) {
      case "dashboard":
        return <Dashboard user={user} onNavigate={setPage} payload={payload} loading={loading} />;
      case "schedule":
        return <UpdatedSchedulePage interventionData={payload.updatedScheduleData} loading={loading} />;
      case "intervention":
        return <InterventionPage plan={payload.interventionPlan} hotTask={payload.hotTask} loading={loading} />;
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

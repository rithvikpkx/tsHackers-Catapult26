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

function Dashboard({ user, onNavigate }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="main">
      <div className="greeting">
        <h1>{greeting}, {user.firstName}</h1>
        <p>Your semester health is stable. Two tasks need attention tonight.</p>
      </div>
      <MetricCards metrics={DEMO_METRICS} />
      <PulseChart />
      <div className="two-col">
        <TaskList tasks={DEMO_TASKS} />
        <DistortionPanel insights={DEMO_DISTORTION} />
      </div>
      <InterventionCard intervention={DEMO_INTERVENTION} onOpen={() => onNavigate("intervention")} />
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

  if (!user) return <Login onLogin={setUser} />;

  function renderPage() {
    switch (page) {
      case "dashboard":    return <Dashboard user={user} onNavigate={setPage} />;
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
import { useEffect } from "react";
import "./Sidebar.css";

const NAV_ITEMS = [
  { label: "Dashboard", icon: "[]", page: "dashboard" },
  { label: "Tasks", icon: "##", page: "tasks" },
  { label: "Schedule", icon: "::", page: "schedule" },
  { label: "Start Mode", icon: ">>", page: "start" },
  { label: "Intervention", icon: "!!", page: "intervention" },
];

export default function Sidebar({ open, onClose, currentPage, onNavigate, user }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <span className="sidebar-dot" />
            <span className="sidebar-brand">GRIND</span>
          </div>
          {user && (
            <div className="sidebar-user">
              <div className="sidebar-avatar">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <div>
                <div className="sidebar-name">
                  {user.firstName} {user.lastName}
                </div>
                <div className="sidebar-grade">{user.gradeYear}</div>
              </div>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.page}
              className={`sidebar-item ${currentPage === item.page ? "active" : ""}`}
              onClick={() => {
                onNavigate(item.page);
                onClose();
              }}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-item" style={{ color: "var(--text-hint)" }}>
            <span className="sidebar-icon">..</span>
            Settings
          </button>
        </div>
      </aside>
    </>
  );
}

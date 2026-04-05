import { useEffect } from "react";
import "./Sidebar.css";

const NAV_ITEMS = [
  { label: "Dashboard", icon: "[]", page: "dashboard" },
  { label: "Tasks", icon: "*", page: "tasks" },
  { label: "Schedule", icon: "#", page: "schedule" },
  { label: "Start Mode", icon: ">", page: "start" },
  { label: "Intervention", icon: "!", page: "intervention" },
];

export default function Sidebar({ open, onClose, currentPage, onNavigate, user }) {
  const fullName = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const displayName = fullName || user?.email || "Student";
  const avatarInitials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "S";
  const subtitle = user?.email || (user?.gradeYear ? `${user.gradeYear} student` : "Google account connected");

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
                {user.picture ? (
                  <img className="sidebar-avatar-img" src={user.picture} alt={`${displayName} avatar`} />
                ) : (
                  avatarInitials
                )}
              </div>
              <div>
                <div className="sidebar-name">{displayName}</div>
                <div className="sidebar-grade">{subtitle}</div>
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
            <span className="sidebar-icon">o</span>
            Settings
          </button>
        </div>
      </aside>
    </>
  );
}

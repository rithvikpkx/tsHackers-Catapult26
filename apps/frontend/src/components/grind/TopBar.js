export default function TopBar({
  onMenuClick,
  onSyncCalendar,
  onOpenStartMode,
  calendarConnected,
  actionBusy,
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn" aria-label="Menu" onClick={onMenuClick}>
          |||
        </button>
        <a href="/" className="logo">
          <span className="logo-dot" />
          <span className="logo-text">GRIND</span>
        </a>
      </div>
      <div className="topbar-right">
        <button className="topbar-pill" onClick={onSyncCalendar} disabled={actionBusy}>
          {calendarConnected ? "Sync calendar" : "Refresh"}
        </button>
        <button className="topbar-pill topbar-pill-primary" onClick={onOpenStartMode} disabled={actionBusy}>
          Start mode
        </button>
      </div>
    </header>
  );
}

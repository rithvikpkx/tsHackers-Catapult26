export default function TopBar({
  onMenuClick,
  onSyncCalendar,
  onOpenStartMode,
  calendarConnected,
  actionBusy,
  showMenu = true,
  showStartAction = true,
  calendarActionLabel,
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        {showMenu ? (
          <button className="icon-btn" aria-label="Menu" onClick={onMenuClick}>
            |||
          </button>
        ) : (
          <div className="icon-btn icon-btn-placeholder" />
        )}
        <a href="/" className="logo">
          <span className="logo-dot" />
          <span className="logo-text">GRIND</span>
        </a>
      </div>
      <div className="topbar-right">
        <button className="topbar-pill" onClick={onSyncCalendar} disabled={actionBusy}>
          {calendarActionLabel || (calendarConnected ? "Sync calendar" : "Refresh")}
        </button>
        {showStartAction && (
          <button className="topbar-pill topbar-pill-primary" onClick={onOpenStartMode} disabled={actionBusy}>
            Start mode
          </button>
        )}
      </div>
    </header>
  );
}
